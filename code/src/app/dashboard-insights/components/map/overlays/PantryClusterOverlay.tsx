"use client"

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

type PantryClusterOverlayProps = {
  map: MLMap;
  idSuffix?: string; //to avoid id clashes if you mount mulitple overlays
  onPantryClick: (pantryId: string) => void; //Modified later
};

type PantryDoc={
  name?: string;
  state?: string;
  cords?: {
    lat?: number;
    lng?: number;
  };
  
}



export default function PantryClusterOverlay({
  map,
  idSuffix = "",
  onPantryClick,
}: PantryClusterOverlayProps) {
  useEffect(() => {
    if (!map) return;
    const m = map;

    // Unique IDs for layers and sources based on suffix
    const SRC_ID = `pantries${idSuffix}`;
    const CLUST_ID = `pantry-clusters${idSuffix}`;
    const CNT_ID = `pantry-cluster-count${idSuffix}`;
    const PT_ID = `unclustered-pantry-point${idSuffix}`;
    const SELECTED_ID = `selected-pantry-point${idSuffix}`;
    const PANTRY_ICON_ID = `pantry-icon${idSuffix}`;

    let unmounted = false;

    async function draw() {
      // 1. Fetch food pantry data from the "pantries" collection
      const q = query(collection(db, "pantries"));
      const snap = await getDocs(q);
      if (unmounted) return;

      const features = snap.docs.flatMap((docSnap) => {
        const d = docSnap.data() as PantryDoc;
        const lat = d?.cords?.lat;
        const lng = d?.cords?.lng;

        // Skip missing or invalid coordinates safely
        if (typeof lat !== "number" || typeof lng !== "number") return [];

        return [
          {
            type: "Feature" as const,
            properties: {
              id: docSnap.id,
              name: d.name ?? "Food Pantry",
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

      /* Load custom icon for Pantry on the Pantry Tab */
      if (!m.hasImage(PANTRY_ICON_ID)) {
        try {
          const pantryIcon = await m.loadImage("/pantry-icon.png"); 
          if (unmounted) return;
          m.addImage(PANTRY_ICON_ID, pantryIcon.data);
        } catch (err) {
          console.warn("Could not load pantry icon asset, utilizing generic marker context.", err);
        }
      }

      // Defensive cleanup prior to adding to eliminate map source conflicts
      try {
        if (m.getLayer(CNT_ID)) m.removeLayer(CNT_ID);
        if (m.getLayer(CLUST_ID)) m.removeLayer(CLUST_ID);
        if (m.getLayer(PT_ID)) m.removeLayer(PT_ID);
        if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
      } catch {}

      // 3. Add clustered geojson map source
      m.addSource(SRC_ID, {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterRadius: 45,
        clusterMaxZoom: 14,
      } as any);

      // 4. Draw cluster bubbles (Green/Emerald Theme for natural food organization style)
      m.addLayer({
        id: CLUST_ID,
        type: "circle",
        source: SRC_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,   // size for < 10 pantries
            10, 20,   // size for 10-49 pantries
            50, 24,   // size for 50+ pantries
          ],
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#2e7d32", // Green theme for low density
            10, "#1b5e20", // Darker green for medium density
            50, "#0a3612", // Forest green for high density
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      } as any);

      // 5. Cluster number text layers
      m.addLayer({
        id: CNT_ID,
        type: "symbol",
        source: SRC_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 14,
        },
        paint: {
          "text-color": "#ffffff",
        },
      } as any);

      // 6. Non-clustered single pantry points
      m.addLayer({
        id: PT_ID,
        type: m.hasImage(PANTRY_ICON_ID) ? "symbol" : "circle",
        source: SRC_ID,
        filter: ["!", ["has", "point_count"]],
        layout: m.hasImage(PANTRY_ICON_ID) ? {
          "icon-image": PANTRY_ICON_ID,
          "icon-size": 0.05,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        } : {},
        paint: m.hasImage(PANTRY_ICON_ID) ? {} : {
          "circle-radius": 7,
          "circle-color": "#4caf50",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5
        }
      } as any);

      // 7. Click interactions for unclustered individual food pantries
      const onPointClick = (e: MapLayerMouseEvent) => {
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (!f) return;
        const [lng, lat] = (f.geometry as any).coordinates as [number, number];
        const { name } = (f.properties ?? {}) as { name?: string };

        // Generate 3-mile service range polygon
        const poly = replaceFixedRadiusFromCenter(m, [lng, lat], 3, { idSuffix });
        onPantryClick?.(poly, name ?? "Food Pantry");

        // Clear existing structural selections
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

        // Highlight selection ring
        m.addLayer({
          id: SELECTED_ID,
          type: "circle",
          source: SELECTED_ID,
          paint: {
            "circle-radius": 16,
            "circle-color": "rgba(0, 0, 0, 0)",
            "circle-stroke-color": "#0d2310",
            "circle-stroke-width": 3,
          },
        } as any);
      };

      // Expand macro cluster circles on user tap
      const onClusterClick = (e: MapLayerMouseEvent) => {
        const feats = m.queryRenderedFeatures(e.point, { layers: [CLUST_ID] });
        if (!feats?.length) return;
        const clusterId = (feats[0].properties as any)?.cluster_id;
        (m.getSource(SRC_ID) as any)?.getClusterExpansionZoom(
          clusterId,
          (err: any, z: number) => {
            if (err) return;
            const center = (feats[0].geometry as any).coordinates as [number, number];
            m.easeTo({ center, zoom: z });
          }
        );
      };

      // Cursor modifications
      const setCursor = (v: string) => (m.getCanvas().style.cursor = v);
      const onEnter = () => setCursor("pointer");
      const onLeave = () => setCursor("");

      m.on("click", PT_ID, onPointClick);
      m.on("click", CLUST_ID, onClusterClick);
      m.on("mouseenter", PT_ID, onEnter);
      m.on("mouseleave", PT_ID, onLeave);
      m.on("mouseenter", CLUST_ID, onEnter);
      m.on("mouseleave", CLUST_ID, onLeave);

      return () => {
        try { m.off("click", PT_ID, onPointClick); } catch {}
        try { m.off("click", CLUST_ID, onClusterClick); } catch {}
        try { m.off("mouseenter", PT_ID, onEnter); } catch {}
        try { m.off("mouseleave", PT_ID, onLeave); } catch {}
        try { m.off("mouseenter", CLUST_ID, onEnter); } catch {}
        try { m.off("mouseleave", CLUST_ID, onLeave); } catch {}
      };
    }

    if (!m.isStyleLoaded()) {
      const onLoad = () => {
        void draw();
        m.off("load", onLoad);
      };
      m.on("load", onLoad);
    } else {
      void draw();
    }

    // Complete cleanup breakdown on map removal or component restructuring
    return () => {
      unmounted = true;
      try { if (m.getLayer(CNT_ID)) m.removeLayer(CNT_ID); } catch {}
      try { if (m.getLayer(CLUST_ID)) m.removeLayer(CLUST_ID); } catch {}
      try { if (m.getLayer(PT_ID)) m.removeLayer(PT_ID); } catch {}
      try { if (m.getSource(SRC_ID)) m.removeSource(SRC_ID); } catch {}
      try { if (m.getLayer(SELECTED_ID)) m.removeLayer(SELECTED_ID); } catch {}
      try { if (m.getSource(SELECTED_ID)) m.removeSource(SELECTED_ID); } catch {}
      try { m.getCanvas().style.cursor = ""; } catch {}
      try { clearFixedRadius(m, { idSuffix }); } catch {}
      try { onPantryClick?.(null); } catch {}
    };
  }, [map, idSuffix, onPantryClick]);

  return null;
}
   