"use client";

import { useEffect, useRef } from "react";
import type { Map as MLMap, LngLatBoundsLike } from "maplibre-gl";

/**
 * CountyOverlay
 *
 * Minimal, self-contained overlay that:
 *  - Accepts a boundary selection from outside the map
 *    ({ type: "county" | "zip", countyName, zcta? }).
 *  - Fetches the corresponding GeoJSON:
 *      • county → /data/ga-counties.geojson (match `properties.NAME`)
 *      • zip    → /data/zips/ga-zips-{kebab(county)}.geojson (match `properties.zcta`)
 *  - Adds **one** GeoJSON source with the single selected feature.
 *  - Renders a translucent fill + a visible outline (never both county and ZIP at once).
 *  - Fits the camera to that feature’s bbox.
 *
 * When `selection` is `null`, any previously-added layers/sources are removed.
 * This component does not manage any other map state.
 */
type BoundarySelection =
  | { type: "county"; countyName: string }
  | { type: "zip"; countyName: string; zcta: string }
  | null;

type GJFeature = {
  type: "Feature";
  properties?: Record<string, any>;
  geometry: any;
};
type GJFC = { type: "FeatureCollection"; features: GJFeature[] };

type Props = {
  map: MLMap;
  selection: BoundarySelection;
};

const COUNTIES_URL = "/data/ga-counties.geojson";

/**
 * Build the county-specific ZIP GeoJSON path.
 * Filename is kebab-cased and ASCII-normalized to avoid diacritics/whitespace issues.
 */
const countyZipFile = (countyName: string) =>
  `/data/zips/ga-zips-${countyName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}.geojson`;

const SRC_ID = "selection-boundary-src";
const FILL_ID = "selection-boundary-fill";
const LINE_ID = "selection-boundary-line";

/**
 * Compute a bbox for Polygon/MultiPolygon geometry as [minX, minY, maxX, maxY].
 * Returns null if geometry type is unsupported or coordinates are invalid.
 */
function geometryBBox(geom: any): [number, number, number, number] | null {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const push = (pt: number[]) => {
    const [x, y] = pt;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  if (!geom) return null;
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) for (const p of ring) push(p);
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates)
      for (const ring of poly) for (const p of ring) push(p);
  } else {
    return null;
  }
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY))
    return null;
  return [minX, minY, maxX, maxY];
}

/**
 * Remove previously-added boundary layers/sources to ensure only one
 * boundary visualization exists at a time.
 */
function clearLayers(map: MLMap) {
  try {
    if (map.getLayer(FILL_ID)) map.removeLayer(FILL_ID);
  } catch {}
  try {
    if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID);
  } catch {}
  try {
    if (map.getSource(SRC_ID)) map.removeSource(SRC_ID);
  } catch {}
}

export default function CountyOverlay({ map, selection }: Props) {
  /**
   * Cache the effective selection key to avoid reloading/re-rendering
   * the same boundary repeatedly (basic debounce of identical input).
   */
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    // Nothing selected: remove any previous overlay
    if (!selection) {
      clearLayers(map);
      lastKeyRef.current = "";
      return;
    }

    // Debounce identical selections to prevent redundant work.
    const key =
      selection.type === "county"
        ? `county:${selection.countyName}`
        : `zip:${selection.countyName}:${selection.zcta}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    let cancelled = false;

    (async () => {
      try {
        clearLayers(map);

        let feature: GJFeature | null = null;

        if (selection.type === "county") {
          // Fetch the full counties file and find by NAME match (case-insensitive).
          const res = await fetch(COUNTIES_URL);
          if (!res.ok)
            throw new Error(`Failed to load counties: ${res.status}`);
          const fc = (await res.json()) as GJFC;
          feature =
            fc.features.find(
              (f) =>
                String(f.properties?.NAME ?? "").toLowerCase() ===
                selection.countyName.toLowerCase()
            ) ?? null;
        } else {
          // Fetch the county-specific ZIP set and find by zcta (zero-padded to 5).
          const url = countyZipFile(selection.countyName);
          const zr = await fetch(url);
          if (!zr.ok)
            throw new Error(
              `ZIP file not found for ${selection.countyName}: ${url}`
            );
          const zfc = (await zr.json()) as GJFC;
          feature =
            zfc.features.find(
              (f) =>
                String(f.properties?.zcta ?? "").padStart(5, "0") ===
                selection.zcta
            ) ?? null;
        }

        if (cancelled) return;

        if (!feature || !feature.geometry) {
          console.warn(
            "[CountyOverlay] No matching feature found for selection:",
            selection
          );
          return;
        }

        // Normalize to satisfy GeoJSON typing (properties cannot be undefined)
        const safeFeature: GeoJSON.Feature = {
          type: "Feature",
          properties: feature.properties ?? {},
          geometry: feature.geometry,
        };

        // Add a single source with the selected feature.
        map.addSource(SRC_ID, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [safeFeature],
          } as GeoJSON.FeatureCollection, // typed as standard GeoJSON
        });

        // Fill layer: light translucent fill to show area without obscuring base map.
        map.addLayer({
          id: FILL_ID,
          type: "fill",
          source: SRC_ID,
          paint: {
            "fill-color": "#9ea4ad",
            "fill-opacity": 0.18,
          },
        });

        // Outline
        map.addLayer({
          id: LINE_ID,
          type: "line",
          source: SRC_ID,
          paint: {
            "line-color": "#181a1f",
            "line-width": 2,
            "line-opacity": 0.6,
            "line-dasharray": [4, 2],
          },
        });

        // Fit camera to boundary bbox with modest padding.
        const bbox = geometryBBox(feature.geometry);
        if (bbox) {
          map.fitBounds(bbox as LngLatBoundsLike, {
            padding: { top: 40, right: 40, bottom: 40, left: 40 },
            duration: 600,
          });
        }
      } catch (e: any) {
        console.error("[CountyOverlay] error:", e?.message ?? e);
      }
    })();

    // If the effect re-runs or unmounts, prevent state from applying.
    return () => {
      cancelled = true;
    };
  }, [map, selection]);

  return null;
}
