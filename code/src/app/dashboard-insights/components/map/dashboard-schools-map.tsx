"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl, {
  Map as MLMap,
  LngLatLike,
  LngLatBounds,
} from "maplibre-gl";

import DistributionHeatmapOverlay from "./overlays/distribution-heatmap-overlay";
import SchoolsClusterOverlay from "./overlays/SchoolsClusterOverlay";
import GeorgiaOutlineOverlay from "./overlays/GeorgiaOutlineOverlay";
import DistributionOverlay from "./overlays/distribution-overlay";

import type { PolygonFeature } from "./overlays/click-radius";
import { clearFixedRadius } from "./overlays/click-radius";

/**
 * Utility type for map padding. Mirrors MapLibre's padding shape while also
 * supporting a single numeric value for uniform padding.
 */
type Padding =
  | number
  | { top: number; right: number; bottom: number; left: number };

/**
 * Props for the dashboard schools map component.
 *
 * @property className               Optional CSS class string applied to the map container.
 *
 * @property center                  Initial map center (LngLatLike). Defaults to roughly Gwinnett County.
 *
 * @property zoom                    Initial map zoom level. Defaults to 11.
 *
 * @property geojsonUrl              URL to a GeoJSON FeatureCollection<Point> used by the distribution
 *                                   overlays (heatmap + dissolved buffers). Points may include `properties.weight`.
 *
 * @property privacyRadiusMeters     Distance in meters used by DistributionOverlay to buffer each point
 *                                   before dissolving into polygons. Defaults to 500.
 *
 * @property jitterMeters            Optional jitter distance (meters) applied to points in overlays for
 *                                   privacy. Set to 0 to disable. Defaults to 0.
 *
 * @property showSchools             Whether to render the SchoolsClusterOverlay (clustered school points).
 *                                   Defaults to true.
 *
 * @property onClearSelection        Optional callback invoked when the user triggers the "Clear Selection"
 *                                   control in the map (after local selection state is cleared).
 *
 * @property viewPadding             Optional map padding used when fitting or easing (not actively used here,
 *                                   but kept for compatibility/extension).
 *
 * @property onSelectionChange       Callback that receives `{ schoolName, householdCount }` whenever either
 *                                   the selected school name or the counted households within the selected
 *                                   radius changes. Useful for updating a sidebar DataCard.
 */
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
  onSelectionChange?: (info: { schoolName: string; householdCount: number }) => void;
};

/**
 * Geographic bounds used to clamp/limit map navigation to the state of Georgia.
 * This is provided to MapLibre as `maxBounds` to prevent panning far outside GA.
 */
const GA_BOUNDS: [[number, number], [number, number]] = [
  [-86.33327, 29.658835],
  [-80.02333, 35.697465],
];

/**
 * DashboardSchoolsMap
 *
 * High-level map container that:
 *  - creates and owns a MapLibre map instance,
 *  - renders the Georgia outline,
 *  - mounts both the distribution overlays (heatmap + dissolved buffers),
 *  - mounts clustered school points with click-to-select radius,
 *  - manages selection state (selected ring + school name),
 *  - computes and bubbles up household counts within the selected ring.
 *
 * Key behaviors:
 *  - Clicking a school in SchoolsClusterOverlay draws a fixed-radius ring (via click-radius helpers)
 *    and updates the local `selection` state with the selected polygon + school name.
 *  - DistributionOverlay listens to `selectedArea` and reports how many input points fall inside it.
 *  - The "Clear Selection" control removes the ring, clears the highlight dot (if present), resets count,
 *    and notifies `onClearSelection` if provided.
 */
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
  onSelectionChange,
}: Props) {
  /** DOM ref for MapLibre container. */
  const containerRef = useRef<HTMLDivElement | null>(null);
  /** Ref to the live MapLibre instance (safe to pass to overlays). */
  const mapRef = useRef<MLMap | null>(null);
  /** React state mirror of the map instance (drives conditional overlay rendering). */
  const [map, setMap] = useState<MLMap | null>(null);
   /** Guard to prevent multiple initializations if React re-renders quickly. */
  const initializedRef = useRef(false);

  /**
   * Local selection state:
   * - poly: the current radius polygon drawn around the clicked school (or null).
   * - schoolName: the name of the currently selected school (or null).
   */
  const [selection, setSelection] = useState<{
    poly: PolygonFeature | null;
    schoolName: string | null;
  }>({ poly: null, schoolName: null });

  /**
   * Count of households within the current `selection.poly`.
   * This is updated by the DistributionOverlay via `onHouseholdCount`.
   */
  const [householdCount, setHouseholdCount] = useState(0);

  /**
   * Bubble selection info upward whenever either the school name or the
   * computed household count changes. Parent components can subscribe
   * (e.g., to update sidebar DataCard content).
   */
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange({
        schoolName: selection.schoolName ?? "",
        householdCount,
      });
    }
  }, [selection.schoolName, householdCount, onSelectionChange]);

  /**
   * Clamp a candidate center to Georgia bounds. Useful if you later re-enable the
   * commented easeTo block and want to guarantee the map stays within GA_BOUNDS.
   */
  const clampToGeorgia = (c: LngLatLike): [number, number] => {
    const ll = maplibregl.LngLat.convert(c);
    const ga = new LngLatBounds(GA_BOUNDS[0], GA_BOUNDS[1]);
    const clampedLng = Math.min(Math.max(ll.lng, ga.getWest()), ga.getEast());
    const clampedLat = Math.min(Math.max(ll.lat, ga.getSouth()), ga.getNorth());
    return [clampedLng, clampedLat];
  };

  /**
   * One-time map initialization effect:
   * - creates the MapLibre map,
   * - registers a "Clear Selection" control,
   * - sets up basic controls and resize handling,
   * - exposes the instance to overlays via state + ref,
   * - cleans up on unmount.
   */
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

    /**
     * Inline MapLibre control that injects a "Clear Selection" button in the map UI.
     * On click, it runs `handleClear`, which wipes the fixed-radius polygon, removes the
     * selected-point highlight, resets local selection + count, and calls `onClearSelection`.
     */
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

    // Register controls (note: we intentionally pass our local handler here).
    m.addControl(new ResetButton(handleClear), "top-right");

    m.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-left"
    );
    m.addControl(
      new maplibregl.ScaleControl({ unit: "imperial" }),
      "bottom-left"
    );

    // Keep the map responsive to container size changes.
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(containerRef.current);

    // Expose the map instance after the style is loaded.
    m.on("load", () => {
      mapRef.current = m;
      setMap(m);
      initializedRef.current = true;
    });

    m.on("error", (e) => console.error("[Map error]", e?.error || e));

    // Cleanup map + observers on unmount.
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

  /**
   * Handler called by SchoolsClusterOverlay when a school is clicked.
   * Stores the new selection polygon and school name. The DistributionOverlay
   * will then recompute household counts based on this polygon.
   */
  const handleAreaSelect = useCallback((poly: PolygonFeature | null, name?: string) => {
    setSelection({ poly, schoolName: name ?? null });
  }, []);

  /**
   * Clear-selection handler used by the ResetButton control.
   * Steps:
   *  1) Remove the fixed-radius ring for the schools overlay instance.
   *  2) Remove the selected-point highlight layer/source if present.
   *  3) Reset local selection state and household count.
   *  4) Notify the optional `onClearSelection` callback.
   */
  const handleClear = useCallback(() => {
    try {
      const map = mapRef.current;
      if (!map) return;

      // Remove the radius ring drawn by click-radius helpers for the "-schools" overlay.
      clearFixedRadius(map, { idSuffix: "-schools" });

      // Also remove the selected school highlight point (if present).
      const SELECTED_ID = "selected-point-schools";
      if (map.getLayer(SELECTED_ID)) map.removeLayer(SELECTED_ID);
      if (map.getSource(SELECTED_ID)) map.removeSource(SELECTED_ID);
    } catch {}
    // Reset local UI state.
    setSelection({ poly: null, schoolName: null });
    setHouseholdCount(0);
    // Optional external notification.
    try { onClearSelection?.(); } catch {}
  }, [onClearSelection]);

  return (
    <>
      <div ref={containerRef} className={`${className} school-map`} />

      {/* Very noticeable Georgia outline */}
      {map && <GeorgiaOutlineOverlay map={map} />}

      {/* Distribution: dissolved coverage + heatmap (data-driven layers) */}
      {map && geojsonUrl && (
        <>
          <DistributionOverlay
            map={map}
            geojsonUrl={geojsonUrl}
            privacyRadiusMeters={privacyRadiusMeters}
            jitterMeters={jitterMeters}
            selectedArea={selection.poly}
            onHouseholdCount={setHouseholdCount}
          />
          <DistributionHeatmapOverlay
            map={map}
            geojsonUrl={geojsonUrl}
            privacyRadiusMeters={privacyRadiusMeters}
            jitterMeters={jitterMeters}
          />
        </>
      )}

      {/* Clustered schools with click-to-select radius + highlight */}
      {map && showSchools && (
        <SchoolsClusterOverlay 
          map={map} 
          idSuffix="-schools" 
          onAreaSelect={handleAreaSelect}
        />
      )}
    </>
  );
}
