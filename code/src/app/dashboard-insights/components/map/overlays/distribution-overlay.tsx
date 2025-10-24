"use client";

import { useEffect } from "react";
import type { Map as MLMap } from "maplibre-gl";
import * as turf from "@turf/turf";
import type {
  Feature as GJFeature,
  FeatureCollection as GJFeatureCollection,
  Point,
  Polygon,
  MultiPolygon,
  GeoJsonProperties,
} from "geojson";
import type { PolygonFeature } from "./click-radius";

/**
 * Props for the distribution overlay component.
 *
 * @property map                    Active MapLibre GL map instance. If null, the overlay does nothing.
 * 
 * @property geojsonUrl             URL to a GeoJSON FeatureCollection<Point>. Each feature represents a household
 *                                  or data point and can include an optional numeric `properties.weight` for intensity.
 * 
 * @property privacyRadiusMeters    Distance in meters used to buffer each point into a small circle before dissolving
 *                                  into polygons. Controls the apparent “coverage area” size. Defaults to 500.
 * 
 * @property jitterMeters           Optional random offset (in meters) applied to each point’s coordinates for privacy.
 *                                  Set to 0 to disable. Default: 0.
 * 
 * @property idSuffix               Optional suffix appended to source/layer IDs to prevent collisions when multiple
 *                                  overlays are mounted on the same map instance.
 * 
 * @property selectedArea           Optional polygon feature representing a user-selected region (e.g., a radius around
 *                                  a school). Used to count how many data points fall within that boundary.
 * 
 * @property onHouseholdCount       Callback function that receives the number of household points located inside the
 *                                  selected area polygon. Invoked whenever selection or data changes.
 */
type Props = {
  map: MLMap | null;
  geojsonUrl: string; 
  privacyRadiusMeters?: number;
  jitterMeters?: number;
  idSuffix?: string;
  selectedArea?: PolygonFeature | null;
  onHouseholdCount?: (count: number) => void;
};

/**
 * DistributionOverlay
 *
 * Renders a **filled coverage overlay** by buffering every input point into a small circle
 * (using `privacyRadiusMeters`) and dissolving the circles into unified polygons. This yields
 * a contiguous “coverage area” visualization rather than individual dots.
 *
 * Additionally, when a `selectedArea` polygon is provided (e.g., a user-clicked radius ring),
 * this component **counts** how many input points fall inside that polygon and reports the
 * number via `onHouseholdCount`. Importantly, the counting logic is isolated in a separate
 * effect so UI clicks do not force this overlay to rebuild its layers.
 *
 * Data flow:
 * - Fetch FeatureCollection<Point> from `geojsonUrl`
 * - (Optional) jitter each point to protect privacy
 * - Build small turf circles around each point (radius = privacyRadiusMeters)
 * - Dissolve circles into larger polygons for a clean fill
 * - Add/replace a GeoJSON source + two layers (fill + outline) to the map
 *
 * Layering:
 * - Adds layers with IDs derived from `idSuffix` to avoid collisions when mounted more than once.
 * - If you also render clustered schools/points, adjust `addLayer`'s `beforeId` (not shown here)
 *   or call `map.moveLayer` externally to control visual stacking order.
 */
export default function DistributionOverlay({
  map,
  geojsonUrl,
  privacyRadiusMeters = 500,
  jitterMeters = 0,
  idSuffix = "",
  selectedArea,
  onHouseholdCount,
}: Props) {

  /**
   * Count effect (decoupled from drawing):
   * When the user selects an area (e.g., a 3-mile ring around a school), we:
   *  - fetch the points,
   *  - test each for inclusion using turf.booleanPointInPolygon,
   *  - emit the total via onHouseholdCount.
   *
   * This runs independently of the overlay draw effect to avoid re-adding layers on each click.
   */
   useEffect(() => {
    if (!map || !selectedArea?.geometry || !onHouseholdCount) return;

    (async () => {
      try {
        const res = await fetch(geojsonUrl, { cache: "no-cache" });
        const points = (await res.json()) as GJFeatureCollection<Point, GeoJsonProperties>;

        let count = 0;
        for (const f of points.features) {
          if (!f || f.geometry?.type !== "Point") continue;
          const pt = turf.point(f.geometry.coordinates);
          if (turf.booleanPointInPolygon(pt, selectedArea.geometry)) count++;
        }
        onHouseholdCount(count);
      } catch (err) {
        console.error("[DistributionOverlay] Count computation failed:", err);
      }
    })();
  }, [map, geojsonUrl, selectedArea, onHouseholdCount]);

  /**
   * Draw effect:
   * Builds the coverage polygons and places them on the map as a filled layer with an outline.
   * We:
   *  - fetch the input points
   *  - (optionally) jitter them for privacy
   *  - buffer each into a small circle (turf.circle; radius in km)
   *  - dissolve all circles to merge overlaps into one or more polygons
   *  - add/replace a GeoJSON source and two layers (fill/line)
   *
   * Cleanup removes both layers and the source defensively.
   */
  useEffect(() => {
    if (!map) return;
    const m = map;

    const SRC_ID = `privacy-src${idSuffix}`;
    const FILL_ID = `privacy-fill${idSuffix}`;
    const OUTLINE_ID = `privacy-outline${idSuffix}`;

    let aborted = false;

    const rand = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    /**
     * Jitter a lon/lat pair by up to `meters` in a random direction.
     * - Keeps the original point when meters <= 0.
     * - Approximates meters per degree for lon/lat at the point’s latitude.
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
     * Fetch, buffer, and dissolve the dataset; then (re)attach layers.
     * Uses defensive try/catch around layer/source removal to avoid hard errors
     * if another part of the app manipulates the style concurrently.
     */
    async function draw() {
      const res = await fetch(geojsonUrl, { cache: "no-cache" });
      if (!res.ok) {
        console.error(
          "[DistributionOverlay] fetch failed:",
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

      // 1) Buffer (with optional jitter) -> circles (Polygon features)
      const rKm = privacyRadiusMeters / 1000;
      const circles: GJFeature<Polygon, GeoJsonProperties>[] = [];

      for (const f of points.features) {
        if (!f || f.geometry?.type !== "Point") continue;
        const [lon, lat] = f.geometry.coordinates as [number, number];
        const [lonJ, latJ] =
          jitterMeters > 0
            ? jitterLonLatMeters(lon, lat, jitterMeters)
            : [lon, lat];

        const circle = turf.circle([lonJ, latJ], rKm, {
          steps: 64,
          units: "kilometers",
        });
        // Preserve simple weight if present; useful for downstream styling/analytics.
        const weight = (f.properties?.weight as number | undefined) ?? 0;
        circle.properties ??= {};
        circle.properties.weight = weight;

        circles.push(
          circle as unknown as GJFeature<Polygon, GeoJsonProperties>
        );
      }

       // If no data, remove existing layers/source and exit cleanly.
      if (circles.length === 0) {
        try {
          if (m.getLayer(OUTLINE_ID)) m.removeLayer(OUTLINE_ID);
          if (m.getLayer(FILL_ID)) m.removeLayer(FILL_ID);
          if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
        } catch {}
        return;
      }

     // 2) Prepare FC<Polygon> for dissolve (group tag is optional; used by some turf versions)
      const fcForDissolve: GJFeatureCollection<Polygon, GeoJsonProperties> = {
        type: "FeatureCollection",
        features: circles.map((g) => {
          g.properties ??= {};
          (g.properties as any).__grp = 1;
          return g;
        }),
      };

      // 3) Dissolve with tolerant handling of turf return shape
      //    (can be FeatureCollection or single Feature depending on version/cases).
      let dissolvedFC: GJFeatureCollection<
        Polygon | MultiPolygon,
        GeoJsonProperties
      >;

      try {
        // Turf types vary across versions; coerce to `any` for compatibility.
        const outAny: any = (turf as any).dissolve(fcForDissolve as any);

        if (outAny && outAny.type === "FeatureCollection") {
          dissolvedFC = outAny as GJFeatureCollection<
            Polygon | MultiPolygon,
            GeoJsonProperties
          >;
        } else if (outAny && outAny.type === "Feature") {
          dissolvedFC = {
            type: "FeatureCollection",
            features: [
              outAny as GJFeature<Polygon | MultiPolygon, GeoJsonProperties>,
            ],
          };
        } else {
          // Fallback: keep the original circles (no dissolve).
          dissolvedFC = {
            type: "FeatureCollection",
            features: fcForDissolve.features as unknown as GJFeature<
              Polygon | MultiPolygon,
              GeoJsonProperties
            >[],
          };
        }
      } catch {
        // 4) Last-resort fallback: pairwise union (can be slow on large datasets)
        let merged:
          | GJFeature<Polygon | MultiPolygon, GeoJsonProperties>
          | undefined = fcForDissolve.features[0] as unknown as GJFeature<
          Polygon | MultiPolygon,
          GeoJsonProperties
        >;

        for (let i = 1; i < fcForDissolve.features.length; i++) {
          try {
            const next = fcForDissolve.features[i] as unknown as GJFeature<
              Polygon | MultiPolygon,
              GeoJsonProperties
            >;
            merged = merged
              ? ((turf as any).union(merged as any, next as any) as GJFeature<
                  Polygon | MultiPolygon,
                  GeoJsonProperties
                >)
              : next;
          } catch {
             // If a union fails, skip that feature and keep going.
          }
        }

        dissolvedFC = merged
          ? { type: "FeatureCollection", features: [merged] }
          : { type: "FeatureCollection", features: [] };
      }

       // 5) Replace source/layers atomically to avoid duplicates
      try {
        if (m.getLayer(OUTLINE_ID)) m.removeLayer(OUTLINE_ID);
        if (m.getLayer(FILL_ID)) m.removeLayer(FILL_ID);
        if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
      } catch {}

      m.addSource(SRC_ID, {
        type: "geojson",
        data: dissolvedFC,
      } as any);

      // Filled coverage (semi-transparent)
      m.addLayer({
        id: FILL_ID,
        type: "fill",
        source: SRC_ID,
        minzoom: 12,
        paint: {
          "fill-color": "#e8b90e",
          "fill-opacity": 0.65,
        },
      });

      // Soft outline for definition
      m.addLayer({
        id: OUTLINE_ID,
        type: "line",
        source: SRC_ID,
        minzoom: 12,
        paint: {
          "line-color": "#d6670d",
          "line-opacity": 0.25,
          "line-width": 1.25,
        },
      });
    }

    // Add when style is ready; otherwise listen for 'load'
    if (!m.isStyleLoaded()) {
      const onLoad = () => {
        void draw();
        m.off("load", onLoad);
      };
      m.on("load", onLoad);
    } else {
      void draw();
    }

    // Defensive cleanup
    return () => {
      aborted = true;
      try {
        if (m.getLayer(OUTLINE_ID)) m.removeLayer(OUTLINE_ID);
        if (m.getLayer(FILL_ID)) m.removeLayer(FILL_ID);
        if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
      } catch {}
    };
  }, [
    map,
    geojsonUrl,
    privacyRadiusMeters,
    jitterMeters,
    idSuffix,
  ]);

  return null;
}
