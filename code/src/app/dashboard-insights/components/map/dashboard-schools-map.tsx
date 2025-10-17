"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, LngLatLike } from "maplibre-gl";

import DistributionHeatmapOverlay from "./overlays/distribution-heatmap-overlay";
import SchoolsClusterOverlay from "./overlays/SchoolsClusterOverlay";

type Props = {
  className?: string;
  center?: LngLatLike;
  zoom?: number;
  geojsonUrl?: string; // heatmap points
  privacyRadiusMeters?: number;
  jitterMeters?: number;
  showSchools?: boolean;
  onClearSelection?: () => void; // optional callback for your reset button
};

export default function DashboardSchoolsMap({
  className = "w-full h-full",
  center = [-84.07, 33.95],
  zoom = 11,
  geojsonUrl,
  privacyRadiusMeters = 500,
  jitterMeters = 0,
  showSchools = true,
  onClearSelection,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [map, setMap] = useState<MLMap | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!apiKey) {
      console.error(
        "Missing NEXT_PUBLIC_MAPTILER_KEY; map will not initialize."
      );
      return;
    }

    const m = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/topo-v2/style.json?key=${apiKey}`,
      center,
      zoom,
    });

    class ResetButton implements maplibregl.IControl {
      constructor(private onClear?: () => void) {}
      private container!: HTMLDivElement;
      onAdd() {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Clear Selection";
        btn.setAttribute("aria-label", "Clear selection");
        btn.className = "maplibregl-ctrl t-reset-btn";
        btn.onclick = () => this.onClear?.();
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

    m.addControl(new ResetButton(onClearSelection), "top-right");
    m.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-left"
    );
    m.addControl(
      new maplibregl.ScaleControl({ unit: "imperial" }),
      "bottom-left"
    );

    const ro = new ResizeObserver(() => m.resize());
    ro.observe(containerRef.current);

    m.on("load", () => {
      mapRef.current = m;
      setMap(m);
      initializedRef.current = true;
    });

    m.on("error", (e) => console.error("[Map error]", e?.error || e));

    return () => {
      try {
        ro.disconnect();
      } catch {}
      try {
        m.remove();
      } catch {}
      mapRef.current = null;
      setMap(null);
      initializedRef.current = false;
    };
  }, [onClearSelection]);

  // react to center/zoom prop changes without recreating the map
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
      {map && showSchools && (
        <SchoolsClusterOverlay map={map} idSuffix="-schools" />
      )}
    </>
  );
}
