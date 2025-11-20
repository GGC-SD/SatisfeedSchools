"use client";

import { useEffect } from "react";
import type { Map as MLMap } from "maplibre-gl";
import type {
  Feature as GJFeature,
  FeatureCollection as GJFeatureCollection,
  Point,
  GeoJsonProperties,
} from "geojson";

/**
 * Props for the heatmap overlay component.
 *
 * @property map                    Active MapLibre GL map instance. If null, the overlay does nothing.
 *
 * @property geojsonUrl             URL to a GeoJSON FeatureCollection<Point>. Each feature can include a numeric
 *                                  `properties.weight` used for heatmap intensity; defaults to 1 when missing.
 *
 * @property privacyRadiusMeters    Conceptual smoothing scale used to derive heatmap radius (in pixels) so the
 *                                  visual blur roughly matches the privacy buffer you use elsewhere.
 *
 * @property jitterMeters           Optional randomization (in meters) applied to each point to avoid exact
 *                                  coordinate re-identification. Set to 0 to disable.
 *
 * @property idSuffix               Optional suffix appended to source/layer IDs to avoid collisions when
 *                                  mounting multiple instances of this overlay (e.g., per map).
 */
type Props = {
  map: MLMap | null;
  geojsonUrl: string;
  privacyRadiusMeters?: number;
  jitterMeters?: number;
  idSuffix?: string;
};

/**
 * DistributionHeatmapOverlay
 *
 * React component that mounts a MapLibre **heatmap** layer backed by a remote GeoJSON
 * FeatureCollection<Point>. The layer:
 *  - Optionally jitters each point (in meters) to protect privacy.
 *  - Uses per-point `properties.weight` (fallback 1) to influence heatmap intensity.
 *  - Scales radius/intensity with zoom so the layer remains readable across scales.
 *  - Cleans up its source/layer on unmount or when dependencies change.
 *
 * Lifecycle:
 * 1) `useEffect` -> fetch remote points -> normalize/jitter -> add/replace GeoJSON source
 * 2) Add a single heatmap layer with zoom-driven paint expressions
 * 3) On effect cleanup, remove layer and source safely
 *
 * Notes:
 * - Layer IDs are namespaced by `idSuffix` to support multiple overlays.
 * - This component is *display-only*; it does not emit events or interact with clicks.
 * - If you also render point/circle layers, be mindful of layer order (MapLibre draws last-added on top).
 */
export default function DistributionHeatmapOverlay({
  map,
  geojsonUrl,
  privacyRadiusMeters = 500,
  jitterMeters = 0,
  idSuffix = "",
}: Props) {
  useEffect(() => {
    if (!map) return;
    const m = map;

    // Stable source/layer IDs so we can safely re-add/replace
    const SRC_ID = `heatmap-src${idSuffix}`;
    const HEAT_ID = `heatmap-layer${idSuffix}`;

    let aborted = false;

    // --- helpers ---

    /**
     * Return a random float within [min, max).
     * Used to pick random distance/bearing for jitter.
     */
    const rand = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    /**
     * Jitter a lon/lat by a random distance up to `meters` in a random bearing.
     * Works by converting the distance to a delta in degrees longitude/latitude.
     * If `meters` is falsy or <= 0, returns the input unchanged.
     *
     * @returns [jitteredLon, jitteredLat]
     */
    const jitterLonLatMeters = (
      lon: number,
      lat: number,
      meters: number
    ): [number, number] => {
      if (!meters || meters <= 0) return [lon, lat];
      const distM = rand(0, meters);
      const bearing = rand(0, Math.PI * 2);
      const mPerDegLat = 110_540;
      const mPerDegLon = 111_320 * Math.cos((lat * Math.PI) / 180) || 1e-9;
      const dLat = (Math.cos(bearing) * distM) / mPerDegLat;
      const dLon = (Math.sin(bearing) * distM) / mPerDegLon;
      return [lon + dLon, lat + dLat];
    };

    /**
     * Fetch the GeoJSON, normalize (apply jitter, ensure `weight`), then
     * (re)create the source and heatmap layer with consistent styling.
     *
     * Important pieces:
     * - `radiusBasePx`: derived from `privacyRadiusMeters` to keep a loose parity between
     *    the heatmap blur and any other privacy radius visuals you may show elsewhere.
     * - Paint props (`heatmap-intensity`, `heatmap-radius`, `heatmap-color`): zoom-aware
     *    expressions for consistent readability from z8 to z14+.
     */
    async function draw() {
      // 1) fetch points
      const res = await fetch(geojsonUrl, { cache: "no-cache" });
      if (!res.ok) {
        console.error(
          "[DistributionHeatmapOverlay] fetch failed:",
          geojsonUrl,
          res.status
        );
        return;
      }
      const points = (await res.json()) as GJFeatureCollection<
        Point,
        GeoJsonProperties
      >;
      if (aborted) return;

      // 2) normalize + optional jitter
      const features = (points.features || []).flatMap((f) => {
        if (!f || f.geometry?.type !== "Point") return [];
        const [lon, lat] = f.geometry.coordinates as [number, number];
        const [lonJ, latJ] =
          jitterMeters > 0
            ? jitterLonLatMeters(lon, lat, jitterMeters)
            : [lon, lat];

        const weight =
          typeof f.properties?.weight === "number" &&
          isFinite(f.properties.weight)
            ? f.properties.weight
            : 1;

        const nf: GJFeature<Point, GeoJsonProperties> = {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lonJ, latJ] },
          properties: { ...(f.properties || {}), weight },
        };
        return [nf];
      });

      const fc: GJFeatureCollection<Point, GeoJsonProperties> = {
        type: "FeatureCollection",
        features,
      };

      // 3) replace source/layers (idempotent cleanup to avoid duplicates)
      try {
        if (m.getLayer(HEAT_ID)) m.removeLayer(HEAT_ID);
        if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
      } catch {}

      m.addSource(SRC_ID, {
        type: "geojson",
        data: fc,
      } as any);

      /**
       * Heatmap styling notes:
       * - heatmap-weight: uses feature 'weight' (fallback 1)
       * - heatmap-intensity: scales with zoom (acts like "gain")
       * - heatmap-radius: grows with zoom so clusters don't vanish on zoom out
       * - heatmap-color: standard density ramp
       * - heatmap-opacity: fades at high zoom (so you could add circles if desired)
       */
      const radiusBasePx = Math.max(
        10,
        Math.min(80, Math.round(privacyRadiusMeters / 15))
      );

      m.addLayer({
        id: HEAT_ID,
        type: "heatmap",
        source: SRC_ID,
        maxzoom: 12.5,
        paint: {
          // Use per-point 'weight' to influence density
          "heatmap-weight": [
            "case",
            ["has", "weight"],
            ["max", 0.0, ["coalesce", ["to-number", ["get", "weight"]], 1]],
            1,
          ],

          // Zoom-dependent "gain" to keep it readable across scales
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            0.6,
            10,
            1.0,
            12,
            1.6,
            14,
            2.0,
          ],

          // Radius in px scaled by zoom; tied loosely to privacyRadiusMeters for parity
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            Math.round(radiusBasePx * 0.6),
            10,
            radiusBasePx,
            12,
            Math.round(radiusBasePx * 1.4),
            14,
            Math.round(radiusBasePx * 1.8),
          ],

          // Color ramp by heatmap-density
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],

            0.0,
            "#00000000",

            0.25,
            "#72e3ad30",

            0.45,
            "#cbd0c750",

            0.7,
            "#a0aa8870",

            0.9,
            "#6f837599",

            1.0,
            "#72e3ad99",
          ],

          // Fade heatmap when zoomed in
          "heatmap-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11.5,
            1,
            13,
            0.5,
          ],
        },
      } as any);
    }

    // Ensure the style is loaded before adding sources/layers
    if (!m.isStyleLoaded()) {
      const onLoad = () => {
        void draw();
        m.off("load", onLoad);
      };
      m.on("load", onLoad);
    } else {
      void draw();
    }

    // Cleanup: remove layer/source when props change or component unmounts
    return () => {
      aborted = true;
      try {
        if (m.getLayer(HEAT_ID)) m.removeLayer(HEAT_ID);
        if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
      } catch {}
    };
  }, [map, geojsonUrl, privacyRadiusMeters, jitterMeters, idSuffix]);

  return null;
}
