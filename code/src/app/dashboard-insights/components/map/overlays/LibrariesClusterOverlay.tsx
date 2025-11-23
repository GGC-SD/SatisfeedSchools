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

export type LibrarySelection = {
  docId: string; //firestore document id
  id?: string;
  name: string;
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
};

type Props = {
  map: MLMap | null;
  idSuffix?: string;
  onAreaSelect?: (
    poly: PolygonFeature | null,
    libraryName?: string,
    libraryDocId?: string
  ) => void;
};

type LibraryDoc = {
  name?: string;
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  coords?: { lat: number; lng: number };
};

export default function LibrariesClusterOverlay({
  map,
  idSuffix = "-libraries",
  onAreaSelect,
}: Props) {
  useEffect(() => {
    if (!map) return;
    const m = map;

    const SRC_ID = `libraries-src${idSuffix}`;
    const CLUST_ID = `libraries-clusters${idSuffix}`;
    const CNT_ID = `libraries-cluster-count${idSuffix}`;
    const PT_ID = `libraries-unclustered${idSuffix}`;
    const SELECTED_ID = `selected-point${idSuffix}`;

    let unmounted = false;

    async function draw() {
      const qSnap = await getDocs(query(collection(db, "libraries")));
      if (unmounted) return;

      const features = qSnap.docs.flatMap((docSnap) => {
        const d = docSnap.data() as LibraryDoc;
        const lat = d?.coords?.lat;
        const lng = d?.coords?.lng;
        if (typeof lat !== "number" || typeof lng !== "number") return [];

        return [
          {
            type: "Feature" as const,
            properties: {
              docId: docSnap.id,
              name: d.name ?? "Library",
              address: d.address ?? "",
              city: d.city ?? "",
              county: d.county ?? "",
              state: d.state ?? "",
              zip: d.zip ?? "",
              phone: d.phone ?? "",
              website: d.website ?? "",
            },
            geometry: {
              type: "Point" as const,
              coordinates: [lng, lat] as [number, number],
            },
          },
        ];
      });

      const geojson = { type: "FeatureCollection" as const, features };

      const canvas = m.getCanvas() as HTMLCanvasElement;
      canvas.setAttribute("data-has-libraries", "true");
      canvas.setAttribute("data-libraries-count", String(features.length));

      try {
        if (m.getLayer(CNT_ID)) m.removeLayer(CNT_ID);
        if (m.getLayer(CLUST_ID)) m.removeLayer(CLUST_ID);
        if (m.getLayer(PT_ID)) m.removeLayer(PT_ID);
        if (m.getLayer(SELECTED_ID)) m.removeLayer(SELECTED_ID);
        if (m.getSource(SELECTED_ID)) m.removeSource(SELECTED_ID);
        if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
      } catch {}

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
            "#1d7c4f",
            50,
            "#15613e",
            150,
            "#0d3c27",
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

      // Unclustered library points
      m.addLayer({
        id: PT_ID,
        type: "circle",
        source: SRC_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 10,
          "circle-color": "#1fb874",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
        },
      } as any);

      const onPointClick = (e: MapLayerMouseEvent) => {
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (!f) return;

        const [lng, lat] = (f.geometry as any).coordinates as [number, number];
        const p = (f.properties ?? {}) as any;

        const poly = replaceFixedRadiusFromCenter(m, [lng, lat], 3, {
          idSuffix,
        });

        const selection: LibrarySelection = {
          docId: String(p.docId ?? ""),
          name: String(p.name ?? "Library"),
          address: p.address || "",
          city: p.city || "",
          county: p.county || "",
          state: p.state || "",
          zip: p.zip || "",
          phone: p.phone || "",
          website: p.website || "",
        };

        onAreaSelect?.(poly, selection.name, selection.docId);

        const canvas = m.getCanvas() as HTMLCanvasElement;
        canvas.setAttribute("data-selected-library-docid", selection.docId);
        canvas.setAttribute("data-selected-library-name", selection.name);

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
            "circle-color": "#2563eb",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2,
          },
        } as any);
      };

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
        try {
          m.off("click", PT_ID, onPointClick);
          m.off("click", CLUST_ID, onClusterClick);
          m.off("mouseenter", PT_ID, onEnter);
          m.off("mouseleave", PT_ID, onLeave);
          m.off("mouseenter", CLUST_ID, onEnter);
          m.off("mouseleave", CLUST_ID, onLeave);
        } catch {}
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

    return () => {
      unmounted = true;
      try {
        if (m.getLayer(CNT_ID)) m.removeLayer(CNT_ID);
        if (m.getLayer(CLUST_ID)) m.removeLayer(CLUST_ID);
        if (m.getLayer(PT_ID)) m.removeLayer(PT_ID);
        if (m.getLayer(SELECTED_ID)) m.removeLayer(SELECTED_ID);
        if (m.getSource(SELECTED_ID)) m.removeSource(SELECTED_ID);
        if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
        m.getCanvas().style.cursor = "";
        clearFixedRadius(m, { idSuffix });
        onAreaSelect?.(null);
      } catch {}
    };
  }, [map, idSuffix, onAreaSelect]);

  return null;
}
