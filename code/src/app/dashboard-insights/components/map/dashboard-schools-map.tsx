"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, {
  Map as MLMap,
  LngLatLike,
  LngLatBounds,
} from "maplibre-gl";

import DistributionHeatmapOverlay from "./overlays/distribution-heatmap-overlay";
import SchoolsClusterOverlay from "./overlays/SchoolsClusterOverlay";
import GeorgiaOutlineOverlay from "./overlays/GeorgiaOutlineOverlay";

type Padding =
  | number
  | { top: number; right: number; bottom: number; left: number };

type Props = {
  className?: string;
  center?: LngLatLike;
  zoom?: number;
  geojsonUrl?: string;
  privacyRadiusMeters?: number;
  jitterMeters?: number;
  showSchools?: boolean;
  onClearSelection?: () => void;
  viewPadding?: Padding;
};

const GA_BOUNDS: [[number, number], [number, number]] = [
  [-86.33327, 29.658835],
  [-80.02333, 35.697465],
];

export default function DashboardSchoolsMap({
  className = "w-full h-full",
  center = [-84.07, 33.95],
  zoom = 11,
  geojsonUrl,
  privacyRadiusMeters = 500,
  jitterMeters = 0,
  showSchools = true,
  onClearSelection,
  viewPadding,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [map, setMap] = useState<MLMap | null>(null);
  const initializedRef = useRef(false);

  const clampToGeorgia = (c: LngLatLike): [number, number] => {
    const ll = maplibregl.LngLat.convert(c);
    const ga = new LngLatBounds(GA_BOUNDS[0], GA_BOUNDS[1]);
    const clampedLng = Math.min(Math.max(ll.lng, ga.getWest()), ga.getEast());
    const clampedLat = Math.min(Math.max(ll.lat, ga.getSouth()), ga.getNorth());
    return [clampedLng, clampedLat];
  };

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
      maxBounds: GA_BOUNDS,
      renderWorldCopies: false,
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
        const wrap = document.createElement("div");
        wrap.className = "maplibregl-ctrl my-reset-wrapper";
        wrap.appendChild(btn);
        this.container = wrap;
        return wrap;
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
      // Optional: fit exactly to GA on first load
      // m.fitBounds(GA_BOUNDS, { padding: viewPadding ?? 0, duration: 300 });
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
  }, [onClearSelection, viewPadding]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    try {
      const [lng, lat] = clampToGeorgia(center);
      m.easeTo({
        center: [lng, lat],
        zoom,
        duration: 500,
        ...(viewPadding ? { padding: viewPadding as any } : {}),
      });
    } catch {}
  }, [center, zoom, viewPadding]);

  return (
    <>
      <div ref={containerRef} className={`${className} school-map`} />

      {/* Very noticeable Georgia outline */}
      {map && <GeorgiaOutlineOverlay map={map} />}

      {/* Heatmap (if provided) */}
      {map && geojsonUrl && (
        <DistributionHeatmapOverlay
          map={map}
          geojsonUrl={geojsonUrl}
          privacyRadiusMeters={privacyRadiusMeters}
          jitterMeters={jitterMeters}
        />
      )}

      {/* Clustered schools */}
      {map && showSchools && (
        <SchoolsClusterOverlay map={map} idSuffix="-schools" />
      )}
    </>
  );
}
