"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, LngLatLike } from "maplibre-gl";
import DistributionOverlay from "../distribution-overlay";
import DistributionHeatmapOverlay from "../distribution-heatmap-overlay";

type Props = {
  className?: string;
  center?: LngLatLike; // starting position [lng, lat]
  zoom?: number;
  geojsonUrl?: string; // FeatureCollection<Point> with {weight}
  privacyRadiusMeters?: number;
  jitterMeters?: number;
};

export default function DashboardSchoolsMap({
  className = "w-full h-full",
  center = [-84.07, 33.95], // coords of Gwinnett County
  zoom = 11,
  geojsonUrl,
  privacyRadiusMeters = 500,
  jitterMeters = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [map, setMap] = useState<MLMap | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;

    // from env.local
    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY!;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/topo-v2/style.json?key=${apiKey}`,
      center,
      zoom,
    });

    // custom reset button for map
    const ResetButton = class implements maplibregl.IControl {
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
    };

    // reset button
    map.addControl(new ResetButton(), "top-right");

    // zoom buttons
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-left"
    );

    // Scale bar` (i.e. 10 miles)
    map.addControl(
      new maplibregl.ScaleControl({ unit: "imperial" }),
      "bottom-left"
    );

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    // When map's style and tiles are fully loaded, 
    // store map instance in refs/state so overlays can use it
    // prevents reinitialization by marking it as "initialized"
    // Allows overlays to work
    map.on("load", () => {
      mapRef.current = map;
      setMap(map);
      initializedRef.current = true;
      // console.log("[Map] loaded");
    });

    // log errors from MapLibre
    map.on("error", (e) => console.error("[Map error]", e?.error || e));

    // Cleanup function: runs when component unmounts or effect re-runs
    // Disconnects ResizeObserver, destroys map instance, 
    // and clears refs/state to prevent memory leaks or double maps
    // Keeps overlays stable between mounts
    return () => {
      try { ro.disconnect(); } catch {}
      try { map.remove(); } catch {}
      mapRef.current = null;
      setMap(null);
      initializedRef.current = false;
    };
  }, []);

  // If center/zoom changes, adjust view without rebuilding map
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    try {
      m.easeTo({ center, zoom, duration: 500 });
    } catch {}
  }, [center, zoom]);

  return (
    <>
      <div ref={containerRef} className={`${className} school-map`} />
      {map && geojsonUrl && (
        <DistributionHeatmapOverlay
          map={map}
          geojsonUrl={geojsonUrl}
          privacyRadiusMeters={privacyRadiusMeters}
          jitterMeters={jitterMeters}
        />
      )}
    </>
  );
}