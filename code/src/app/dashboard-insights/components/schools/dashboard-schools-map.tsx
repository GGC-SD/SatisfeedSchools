"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, LngLatLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { db } from "@/firebase/firebaseConfig"; // ← your existing file
import {
  collection,
  getDocs,
  query /*, where, limit */,
} from "firebase/firestore";

type Props = {
  className?: string;
  center?: LngLatLike; // [lng, lat]
  zoom?: number;
};

type SchoolDoc = {
  name?: string;
  state?: string;
  coords?: { lat: number; lng: number };
};

export default function DashboardSchoolsMap({
  className = "w-full h-full",
  center = [-84.07, 33.95], // Gwinnett County
  zoom = 11,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY!;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/topo-v2/style.json?key=${apiKey}`,
      center,
      zoom,
    });

    // --- Controls (reset, nav, scale) ---
    class ResetButton implements maplibregl.IControl {
      private container!: HTMLDivElement;
      onAdd() {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Clear Selection";
        btn.className = "maplibregl-ctrl t-reset-btn";
        const wrapper = document.createElement("div");
        wrapper.className = "maplibregl-ctrl my-reset-wrapper";
        wrapper.appendChild(btn);
        this.container = wrapper;
        return wrapper;
      }
      onRemove() {
        this.container.remove();
      }
    }
    map.addControl(new ResetButton(), "top-right");
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-left"
    );
    map.addControl(
      new maplibregl.ScaleControl({ unit: "imperial" }),
      "bottom-left"
    );

    // Keep map sized with container
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    mapRef.current = map;

    // --- Load Firestore → GeoJSON → clustered layers ---
    const loadAsGeoJSON = async () => {
      // Example filters if needed:
      // const q = query(collection(db, "schools"), where("state", "==", "GA"), limit(3000));
      const q = query(collection(db, "schools"));
      const snap = await getDocs(q);

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

      // Source with clustering
      map.addSource("schools", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterRadius: 40, // px
        clusterMaxZoom: 14, // stop clustering past this zoom
      });

      // Cluster bubbles
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "schools",
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
      });

      // Cluster counts
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "schools",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#fff" },
      });

      // Individual points
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "schools",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 5,
          "circle-color": "#ff3b30",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
        },
      });

      // Popup for single points
      map.on("click", "unclustered-point", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const [lng, lat] = (f.geometry as any).coordinates as [number, number];
        const { id, name, state } = (f.properties ?? {}) as {
          id?: string;
          name?: string;
          state?: string;
        };
        new maplibregl.Popup({ offset: 12 })
          .setLngLat([lng, lat])
          .setHTML(
            `<strong>${name ?? "School"}</strong><br/>${id ?? ""}${
              state ? ` • ${state}` : ""
            }`
          )
          .addTo(map);
      });

      // Click cluster to zoom in
      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        const clusterId = features[0].properties?.cluster_id;
        (map.getSource("schools") as any).getClusterExpansionZoom(
          clusterId,
          (err: any, zoomTo: number) => {
            if (err) return;
            const center = (features[0].geometry as any).coordinates as [
              number,
              number
            ];
            map.easeTo({ center, zoom: zoomTo });
          }
        );
      });

      // Pointer cursor
      map.on(
        "mouseenter",
        "unclustered-point",
        () => (map.getCanvas().style.cursor = "pointer")
      );
      map.on(
        "mouseleave",
        "unclustered-point",
        () => (map.getCanvas().style.cursor = "")
      );
      map.on(
        "mouseenter",
        "clusters",
        () => (map.getCanvas().style.cursor = "pointer")
      );
      map.on(
        "mouseleave",
        "clusters",
        () => (map.getCanvas().style.cursor = "")
      );
    };

    map.once("load", loadAsGeoJSON);

    // Cleanup
    return () => {
      ro.disconnect();
      if (map.getLayer("cluster-count")) map.removeLayer("cluster-count");
      if (map.getLayer("clusters")) map.removeLayer("clusters");
      if (map.getLayer("unclustered-point"))
        map.removeLayer("unclustered-point");
      if (map.getSource("schools")) map.removeSource("schools");
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom]);

  return <div ref={containerRef} className={`${className} school-map`} />;
}
