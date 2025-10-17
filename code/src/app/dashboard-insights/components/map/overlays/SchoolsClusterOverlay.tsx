"use client";

import { useEffect } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { db } from "@/firebase/firebaseConfig";
import {
  collection,
  getDocs,
  query /*, where, limit */,
} from "firebase/firestore";

type Props = {
  map: MLMap | null;
  idSuffix?: string; // to avoid id clashes if you ever mount multiples
  // You can add filters later (state, district, etc.)
};

type SchoolDoc = {
  name?: string;
  state?: string;
  coords?: { lat: number; lng: number };
};

export default function SchoolsClusterOverlay({ map, idSuffix = "" }: Props) {
  useEffect(() => {
    if (!map) return;
    const m = map;

    const SRC_ID = `schools${idSuffix}`;
    const CLUST_ID = `clusters${idSuffix}`;
    const CNT_ID = `cluster-count${idSuffix}`;
    const PT_ID = `unclustered-point${idSuffix}`;

    let unmounted = false;

    async function draw() {
      // 1) Firestore → GeoJSON
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

      // 2) (Re)place source/layers
      try {
        if (m.getLayer(CNT_ID)) m.removeLayer(CNT_ID);
        if (m.getLayer(CLUST_ID)) m.removeLayer(CLUST_ID);
        if (m.getLayer(PT_ID)) m.removeLayer(PT_ID);
        if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
      } catch {}

      m.addSource(SRC_ID, {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 14,
      } as any);

      m.addLayer({
        id: CLUST_ID,
        type: "circle",
        source: SRC_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": [
            "step",
            ["get", "point_count"],
            12,
            50,
            16,
            150,
            20,
          ],
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#6aa9ff",
            50,
            "#3b82f6",
            150,
            "#1e40af",
          ],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
        },
      } as any);

      m.addLayer({
        id: CNT_ID,
        type: "symbol",
        source: SRC_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#fff" },
      } as any);

      m.addLayer({
        id: PT_ID,
        type: "circle",
        source: SRC_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 5,
          "circle-color": "#ff3b30",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
        },
      } as any);

      // 3) interactions
      m.on("click", PT_ID, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const [lng, lat] = (f.geometry as any).coordinates as [number, number];
        const { id, name, state } = (f.properties ?? {}) as {
          id?: string;
          name?: string;
          state?: string;
        };
        new (m as any)._gl.popupCtor({ offset: 12 }) // works with maplibre-gl.Popup
          .setLngLat([lng, lat])
          .setHTML(
            `<strong>${name ?? "School"}</strong><br/>${id ?? ""}${
              state ? ` • ${state}` : ""
            }`
          )
          .addTo(m as any);
      });

      m.on("click", CLUST_ID, (e) => {
        const feats = m.queryRenderedFeatures(e.point, { layers: [CLUST_ID] });
        const clusterId = feats?.[0]?.properties?.cluster_id;
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
      });

      const setCursor = (v: string) => (m.getCanvas().style.cursor = v);
      m.on("mouseenter", PT_ID, () => setCursor("pointer"));
      m.on("mouseleave", PT_ID, () => setCursor(""));
      m.on("mouseenter", CLUST_ID, () => setCursor("pointer"));
      m.on("mouseleave", CLUST_ID, () => setCursor(""));
    }

    if (!m.isStyleLoaded()) {
      const onLoad = () => {
        draw();
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
    };
  }, [map, idSuffix]);

  return null;
}
