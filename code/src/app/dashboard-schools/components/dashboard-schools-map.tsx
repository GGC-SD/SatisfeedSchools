"use client";
import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, LngLatLike } from "maplibre-gl";
// import "maplibre-gl/dist/maplibre-gl.css";

type Props = {
  className?: string;
  center?: LngLatLike; // starting position [lng, lat]
  zoom?: number;
};

export default function DashboardSchoolsMap({
  className = "w-full h-full",
  center = [-84.07, 33.95], // coords of Gwinnett County
  zoom = 11,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // from env.local
    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY!;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/topo-v2/style.json?key=${apiKey}`,
      center,
      zoom,
    });

    const ResetButton = class implements maplibregl.IControl {
      private container!: HTMLDivElement;

      onAdd() {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Reset";
        btn.className = "maplibregl-ctrl my-reset-btn"; // styling hook

        const wrapper = document.createElement("div");
        wrapper.className = "maplibregl-ctrl my-reset-wrapper";
        wrapper.appendChild(btn);

        this.container = wrapper;
        return wrapper;
      }

      onRemove() {
        this.container.remove();
      }
    };

    map.addControl(new ResetButton(), "top-right");

    // zoom buttons
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    // Scale bar` (i.e. 10 miles)
    map.addControl(
      new maplibregl.ScaleControl({ unit: "imperial" }),
      "bottom-left"
    );

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    mapRef.current = map;
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom]);

  return <div ref={containerRef} className={`${className} school-map`} />;
}
