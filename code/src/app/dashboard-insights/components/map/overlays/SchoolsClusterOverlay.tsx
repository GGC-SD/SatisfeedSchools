"use client";

import { useEffect } from "react";
import maplibregl, {
  Map as MLMap,
  MapLayerMouseEvent,
  MapGeoJSONFeature,
} from "maplibre-gl";
import { db } from "@/firebase/firebaseConfig";
import { collection, getDocs, query } from "firebase/firestore";
import {
  replaceFixedRadiusFromCenter,
  clearFixedRadius,
  PolygonFeature,
} from "./click-radius";

/**
 * Props for the schools cluster overlay component.
 *
 * @property map                    Live MapLibre GL map instance. If null, nothing is rendered/attached.
 *
 * @property idSuffix               Optional suffix appended to all internal source/layer IDs so multiple
 *                                  instances can coexist without collisions (e.g., "-schools").
 *
 * @property onAreaSelect           Callback fired when a user clicks an **unclustered** school point.
 *                                  Receives the freshly drawn fixed-radius polygon (Feature<Polygon>)
 *                                  and the school's display name. Use this to update app state/sidebars.
 */
type Props = {
  map: MLMap | null;
  idSuffix?: string; // to avoid id clashes if you mount multiple overlays
  onAreaSelect?: (poly: PolygonFeature | null, schoolName?: string) => void;
};

/**
 * Shape of the school document in Firestore. Coordinates are expected to be
 * WGS84 lon/lat. Missing or non-numeric coords are skipped.
 */
type SchoolDoc = {
  name?: string;
  state?: string;
  coords?: { lat: number; lng: number };
};

/**
 * SchoolsClusterOverlay
 *
 * Renders clustered school points from Firestore:
 *  - Adds a clustered circle layer + count label for clusters.
 *  - Adds a circle layer for **unclustered** (single) school points.
 *  - On clicking an unclustered point, draws/replaces a fixed-radius ring centered on the school
 *    (via `replaceFixedRadiusFromCenter`), highlights the selected school point with a distinct
 *    marker, and emits the polygon + name via `onAreaSelect`.
 *
 * Layer/Source IDs are derived from `idSuffix` to avoid collisions when mounting
 * multiple overlays. Cleanup removes all layers/sources and resets cursor/selection.
 */
export default function SchoolsClusterOverlay({
  map,
  idSuffix = "",
  onAreaSelect,
}: Props) {
  useEffect(() => {
    if (!map) return;
    const m = map;

    // Stable IDs to make add/remove idempotent across re-renders
    const SRC_ID = `schools${idSuffix}`;
    const CLUST_ID = `clusters${idSuffix}`;
    const CNT_ID = `cluster-count${idSuffix}`;
    const PT_ID = `unclustered-point${idSuffix}`;
    const SELECTED_ID = `selected-point${idSuffix}`; // Highlight overlay for the currently-selected school

    let unmounted = false;

    /**
     * Fetch school docs from Firestore, build a FeatureCollection<Point>, then
     * add a clustered source with 3 layers: clusters, cluster-count symbol, and unclustered points.
     */
    async function draw() {
      const q = query(collection(db, "schools"));
      const snap = await getDocs(q);
      if (unmounted) return;

      const features = snap.docs.flatMap((docSnap) => {
        const d = docSnap.data() as SchoolDoc;
        const lat = d?.coords?.lat;
        const lng = d?.coords?.lng;
        if (typeof lat !== "number" || typeof lng !== "number") return [];
        return [
          {
            type: "Feature" as const,
            properties: {
              id: docSnap.id,
              name: d.name ?? "School",
              state: d.state ?? "",
            },
            geometry: {
              type: "Point" as const,
              coordinates: [lng, lat] as [number, number],
            },
          },
        ];
      });

      const geojson = { type: "FeatureCollection" as const, features };

      // Defensive remove before re-adding to avoid duplicate IDs
      try {
        if (m.getLayer(CNT_ID)) m.removeLayer(CNT_ID);
        if (m.getLayer(CLUST_ID)) m.removeLayer(CLUST_ID);
        if (m.getLayer(PT_ID)) m.removeLayer(PT_ID);
        if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
      } catch {}

      // Clustered source
      m.addSource(SRC_ID, {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 14,
      } as any);

      // Cluster bubbles
      m.addLayer({
        id: CLUST_ID,
        type: "circle",
        source: SRC_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": [
            "step",
            ["get", "point_count"],
            15,
            50,
            18,
            150,
            20,
          ],
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#b00b58",
            50,
            "#b5286c",
            150,
            "#96064c",
          ],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
        },
      } as any);

      // Cluster count labels
      m.addLayer({
        id: CNT_ID,
        type: "symbol",
        source: SRC_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 15,
        },
        paint: { "text-color": "#fff" },
      } as any);

      // Unclustered single points (click targets)
      m.addLayer({
        id: PT_ID,
        type: "circle",
        source: SRC_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 10,
          "circle-color": "#a84f79",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
        },
      } as any);

      /**
       * Handle click on an **unclustered** school:
       *  - Draw/replace a fixed 3-mile radius polygon centered on the school.
       *  - Emit selection via onAreaSelect.
       *  - Highlight the clicked school with a distinct marker (SELECTED_ID).
       *  - Show a small popup with name/id/state.
       */
      const onPointClick = (e: MapLayerMouseEvent) => {
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (!f) return;

        const [lng, lat] = (f.geometry as any).coordinates as [number, number];
        const { id, name, state } = (f.properties ?? {}) as {
          id?: string;
          name?: string;
          state?: string;
        };

        // Draw/replace a fixed-radius ring (3 miles) around the clicked school
        const poly = replaceFixedRadiusFromCenter(m, [lng, lat], 3, {
          idSuffix,
        });
        onAreaSelect?.(poly, name ?? "School");

        // Remove any previous highlight marker, then add this one on top
        try {
          if (m.getLayer(SELECTED_ID)) m.removeLayer(SELECTED_ID);
          if (m.getSource(SELECTED_ID)) m.removeSource(SELECTED_ID);
        } catch {}

        m.addSource(SELECTED_ID, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "Point", coordinates: [lng, lat] },
            properties: {},
          },
        } as any);

        m.addLayer({
          id: SELECTED_ID,
          type: "circle",
          source: SELECTED_ID,
          paint: {
            "circle-radius": 14,
            "circle-color": "#107de3", // highlight color
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2,
          },
        } as any);

        // Lightweight info popup
        // new maplibregl.Popup({ offset: 12 })
        //   .setLngLat([lng, lat])
        //   .setHTML(
        //     `<strong>${name ?? "School"}</strong><br/>${id ?? ""}${
        //       state ? ` • ${state}` : ""
        //     }`
        //   )
        //   .addTo(m);
      };

      /**
       * Handle click on a **cluster** bubble:
       *  - Expand the clicked cluster to the appropriate zoom level and center.
       */
      const onClusterClick = (e: MapLayerMouseEvent) => {
        const feats = m.queryRenderedFeatures(e.point, { layers: [CLUST_ID] });
        if (!feats?.length) return;
        const clusterId = (feats[0].properties as any)?.cluster_id;
        (m.getSource(SRC_ID) as any)?.getClusterExpansionZoom(
          clusterId,
          (err: any, z: number) => {
            if (err) return;
            const center = (feats[0].geometry as any).coordinates as [
              number,
              number
            ];
            m.easeTo({ center, zoom: z });
          }
        );
      };

      // Cursor affordances (hand over clickable things)
      const setCursor = (v: string) => (m.getCanvas().style.cursor = v);
      const onEnterPoint = () => setCursor("pointer");
      const onLeavePoint = () => setCursor("");
      const onEnterCluster = () => setCursor("pointer");
      const onLeaveCluster = () => setCursor("");

      // Wire events
      m.on("click", PT_ID, onPointClick);
      m.on("click", CLUST_ID, onClusterClick);
      m.on("mouseenter", PT_ID, onEnterPoint);
      m.on("mouseleave", PT_ID, onLeavePoint);
      m.on("mouseenter", CLUST_ID, onEnterCluster);
      m.on("mouseleave", CLUST_ID, onLeaveCluster);

      // Per-effect cleanup for listeners
      return () => {
        try {
          m.off("click", PT_ID, onPointClick);
        } catch {}
        try {
          m.off("click", CLUST_ID, onClusterClick);
        } catch {}
        try {
          m.off("mouseenter", PT_ID, onEnterPoint);
        } catch {}
        try {
          m.off("mouseleave", PT_ID, onLeavePoint);
        } catch {}
        try {
          m.off("mouseenter", CLUST_ID, onEnterCluster);
        } catch {}
        try {
          m.off("mouseleave", CLUST_ID, onLeaveCluster);
        } catch {}
      };
    }

    // Defer drawing until the style is ready
    if (!m.isStyleLoaded()) {
      const onLoad = () => {
        void draw();
        m.off("load", onLoad);
      };
      m.on("load", onLoad);
    } else {
      void draw();
    }

    // Full overlay cleanup on unmount or dependency change
    return () => {
      unmounted = true;
      try {
        if (m.getLayer(CNT_ID)) m.removeLayer(CNT_ID);
      } catch {}
      try {
        if (m.getLayer(CLUST_ID)) m.removeLayer(CLUST_ID);
      } catch {}
      try {
        if (m.getLayer(PT_ID)) m.removeLayer(PT_ID);
      } catch {}
      try {
        if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
      } catch {}
      try {
        m.getCanvas().style.cursor = "";
      } catch {}
      try {
        clearFixedRadius(m, { idSuffix });
      } catch {}
      try {
        onAreaSelect?.(null);
      } catch {}
      try {
        if (m.getLayer(SELECTED_ID)) m.removeLayer(SELECTED_ID);
        if (m.getSource(SELECTED_ID)) m.removeSource(SELECTED_ID);
      } catch {}
    };
  }, [map, idSuffix, onAreaSelect]);

  return null;
}
