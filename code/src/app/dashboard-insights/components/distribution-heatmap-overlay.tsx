"use client";

import { useEffect } from "react";
import type { Map as MLMap } from "maplibre-gl";
import type {
  Feature as GJFeature,
  FeatureCollection as GJFeatureCollection,
  Point,
  GeoJsonProperties,
} from "geojson";

type Props = {
  map: MLMap | null;
  // URL to FeatureCollection<Point> with { weight }
  geojsonUrl: string;
  // smoothing scale 
  privacyRadiusMeters?: number;
  // Optional jitter in meters (0 = off)
  jitterMeters?: number;
  // Optional unique suffix if mounting multiple overlays
  idSuffix?: string;
};

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

    const SRC_ID = `heatmap-src${idSuffix}`;
    const HEAT_ID = `heatmap-layer${idSuffix}`;

    let aborted = false;

    // --- helpers ---
    const rand = (min: number, max: number) =>
      Math.random() * (max - min) + min;

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

      // 3) replace source/layers
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
            0.0, "rgba(0,0,0,0)",
            0.15, "rgba(207, 163, 19, 0.45)",
            0.3, "rgba(232, 145, 14, 0.65)",
            //0.75, "rgba(199, 108, 28, 0.50)",
            //1.15, "rgba(212, 66, 35, 0.65)",
            1.15, "rgba(247, 206, 22, 0.65)",
          ],

          // Fade heatmap when zoomed in
          "heatmap-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            13,
            1,
            14.25,
            0.0,
          ],
        },
      } as any);
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
      aborted = true;
      try {
        if (m.getLayer(HEAT_ID)) m.removeLayer(HEAT_ID);
        if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
      } catch {}
    };
  }, [map, geojsonUrl, privacyRadiusMeters, jitterMeters, idSuffix]);

  return null;
}
