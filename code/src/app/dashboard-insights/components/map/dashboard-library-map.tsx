"use client";

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import maplibregl, {
  Map as MLMap,
  LngLatLike,
  LngLatBounds,
} from "maplibre-gl";

import DistributionHeatmapOverlay from "./overlays/distribution-heatmap-overlay";
import GeorgiaOutlineOverlay from "./overlays/GeorgiaOutlineOverlay";
import DistributionOverlay from "./overlays/distribution-overlay";
import CountyOverlay from "./overlays/county-overlay";

/**
 * Utility type for map padding. Mirrors MapLibre's padding shape while also
 * supporting a single numeric value for uniform padding.
 */
type Padding =
  | number
  | { top: number; right: number; bottom: number; left: number };

/**
 * Props for the dashboard Library map component.
 */
type Props = {
  className?: string;
  center?: LngLatLike;
  zoom?: number;
  geojsonUrl?: string;
  privacyRadiusMeters?: number;
  jitterMeters?: number;
  onClearSelection?: () => void;
  viewPadding?: Padding;
  boundarySelection?:
    | { type: "county"; countyName: string }
    | { type: "zip"; countyName: string; zcta: string }
    | null;
};

/**
 * Public imperative handle exposed via `forwardRef`.
 */
export type DashboardLibraryMapHandle = {
  clearSelection: () => void;
};

/**
 * Geographic bounds used to clamp/limit map navigation to the state of Georgia.
 */
const GA_BOUNDS: [[number, number], [number, number]] = [
  [-86.33327, 29.658835],
  [-80.02333, 35.697465],
];

/**
 * DashboardLibrariesMap
 *
 * High-level map container that:
 *  - creates and owns a MapLibre map instance,
 *  - renders the Georgia outline,
 *  - mounts distribution overlays (heatmap + dissolved buffers),
 *  - renders a County/ZIP boundary overlay passed in from the UI,
 *  - exposes a simple imperative clear hook.
 *
 * Note: All school-related logic and overlays have been removed.
 */
const DashboardLibraryMap = forwardRef<DashboardLibraryMapHandle, Props>(function DashboardLibraryMap({
  className = "w-full h-full",
  center = [-84.07, 33.95],
  zoom = 11,
  geojsonUrl,
  privacyRadiusMeters = 500,
  jitterMeters = 0,
  onClearSelection,
  viewPadding,
  boundarySelection,
}: Props, ref) {
  /** DOM ref for MapLibre container. */
  const containerRef = useRef<HTMLDivElement | null>(null);
  /** Ref to the live MapLibre instance (safe to pass to overlays). */
  const mapRef = useRef<MLMap | null>(null);
  /** React state mirror of the map instance (drives conditional overlay rendering). */
  const [map, setMap] = useState<MLMap | null>(null);
  /** Guard to prevent multiple initializations if React re-renders quickly. */
  const initializedRef = useRef(false);

  const clampToGeorgia = (c: LngLatLike): [number, number] => {
    const ll = maplibregl.LngLat.convert(c);
    const ga = new LngLatBounds(GA_BOUNDS[0], GA_BOUNDS[1]);
    const clampedLng = Math.min(Math.max(ll.lng, ga.getWest()), ga.getEast());
    const clampedLat = Math.min(Math.max(ll.lat, ga.getSouth()), ga.getNorth());
    return [clampedLng, clampedLat];
  };

  /** One-time map initialization + teardown. */
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!apiKey) {
      console.error("Missing NEXT_PUBLIC_MAPTILER_KEY; map will not initialize.");
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

    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");
    m.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");

    const ro = new ResizeObserver(() => m.resize());
    ro.observe(containerRef.current);

    m.on("load", () => {
      mapRef.current = m;
      setMap(m);
      initializedRef.current = true;
    });

    m.on("error", (e) => console.error("[Map error]", e?.error || e));

    return () => {
      try { ro.disconnect(); } catch {}
      try { m.remove(); } catch {}
      mapRef.current = null;
      setMap(null);
      initializedRef.current = false;
    };
  }, [onClearSelection, viewPadding]);

  /** Placeholder clear handler for future Library selection logic. */
  const handleClear = useCallback(() => {
    try {
      // If you later add a Library selection ring/marker, clean up layers/sources here.
    } finally {
      try { onClearSelection?.(); } catch {}
    }
  }, [onClearSelection]);

  /** Expose clearSelection() to parents. */
  useImperativeHandle(ref, () => ({ clearSelection: handleClear }), [handleClear]);

  return (
    <>
      <div ref={containerRef} className={`${className} library-map`} />

      {/* Georgia outline */}
      {map && <GeorgiaOutlineOverlay map={map} />}

      {/* County/ZIP overlay controlled by `boundarySelection` */}
      {map && <CountyOverlay map={map} selection={boundarySelection ?? null} />}

      {/* Distribution overlays */}
      {map && geojsonUrl && (
        <>
          <DistributionOverlay
            map={map}
            geojsonUrl={geojsonUrl}
            privacyRadiusMeters={privacyRadiusMeters}
            jitterMeters={jitterMeters}
          />
          <DistributionHeatmapOverlay
            map={map}
            geojsonUrl={geojsonUrl}
            privacyRadiusMeters={privacyRadiusMeters}
            jitterMeters={jitterMeters}
          />
        </>
      )}
    </>
  );
});

export default DashboardLibraryMap;