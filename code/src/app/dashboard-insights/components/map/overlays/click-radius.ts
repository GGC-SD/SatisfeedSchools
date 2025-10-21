import type { Map as MLMap, LngLatLike } from "maplibre-gl";

/**
 * Mean Earth radius in meters (WGS-84). Used to convert a great-circle arc distance
 * into an angular distance (δ) for geodesic circle construction.
 */
const EARTH_RADIUS_M = 6371008.8;

/**
 * Minimal GeoJSON Feature type for a Polygon returned/consumed by this module.
 * The polygon represents a fixed-radius “ring” (buffer) around a clicked map point.
 */
export type PolygonFeature = {
  type: "Feature";
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
  properties: Record<string, any>;
};

/**
 * Optional styling for the drawn ring:
 * - fillColor/fillOpacity style the interior.
 * - strokeColor/strokeWidth style the outline.
 * - steps controls circle smoothness (number of vertices).
 */
type StyleOpts = {
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  steps?: number;
};
/**
 * Optional id suffix to avoid collisions when the same overlay
 * is mounted multiple times (e.g., per-map instance).
 */
type IdOpts = { idSuffix?: string };

/**
 * Internal helper: build unique source/layer IDs derived from the suffix.
 */
const ids = (idSuffix = "") => ({
  SRC_ID: `click-radius-src${idSuffix}`,
  FILL_ID: `click-radius-fill${idSuffix}`,
  LINE_ID: `click-radius-line${idSuffix}`,
});

/** Degrees → radians. */
const toRad = (d: number) => (d * Math.PI) / 180;
/** Radians → degrees. */
const toDeg = (r: number) => (r * 180) / Math.PI;

/**
 * Compute a GeoJSON Polygon approximating a geodesic circle of a given radius (in miles)
 * around a provided center (LngLatLike). The circle is sampled into `steps` vertices.
 *
 * Math notes:
 * - Converts linear distance to angular distance δ = d / R.
 * - Uses great-circle forward equations to get each vertex from the center bearing θ.
 * - Returns a closed linear ring (first == last vertex).
 *
 * @param center       MapLibre LngLatLike (array or object) center point.
 * @param radiusMiles  Circle radius in miles.
 * @param steps        Number of vertices for the ring (higher = smoother).
 * @returns            GeoJSON Feature<Polygon> representing the ring.
 */
export function computeFixedRadiusPolygon(
  center: LngLatLike,
  radiusMiles: number,
  steps = 128
): PolygonFeature {
  const [lng, lat] = Array.isArray(center)
    ? (center as [number, number])
    : [(center as any).lng, (center as any).lat];

  const φ1 = toRad(lat);
  const λ1 = toRad(lng);
  const δ = (radiusMiles * 1609.344) / EARTH_RADIUS_M;

  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const θ = (2 * Math.PI * i) / steps;
    const sinφ1 = Math.sin(φ1);
    const cosφ1 = Math.cos(φ1);
    const sinδ = Math.sin(δ);
    const cosδ = Math.cos(δ);
    const sinθ = Math.sin(θ);
    const cosθ = Math.cos(θ);

    const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * cosθ;
    const φ2 = Math.asin(sinφ2);
    const y = sinθ * sinδ * cosφ1;
    const x = cosδ - sinφ1 * sinφ2;
    const λ2 = λ1 + Math.atan2(y, x);

    ring.push([toDeg(λ2), toDeg(φ2)]);
  }

  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: {},
  };
}

/**
 * Remove the currently drawn fixed-radius ring (both layers and source) from the map.
 * Safe to call repeatedly; checks for presence before removing.
 *
 * @param map      MapLibre map instance.
 * @param idSuffix Optional ID suffix to target a specific instance.
 */
export function clearFixedRadius(map: MLMap, { idSuffix }: IdOpts = {}) {
  const { SRC_ID, FILL_ID, LINE_ID } = ids(idSuffix);
  try { if (map.getLayer(FILL_ID)) map.removeLayer(FILL_ID); } catch {}
  try { if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID); } catch {}
  try { if (map.getSource(SRC_ID)) map.removeSource(SRC_ID); } catch {}
}

/**
 * Draw (or update) a fixed-radius ring from a provided GeoJSON polygon feature.
 * Will create the GeoJSON source if absent, otherwise updates its data.
 * Adds fill/line layers lazily if they don’t exist.
 *
 * @param map        MapLibre map instance.
 * @param feature    GeoJSON Feature<Polygon> to render.
 * @param options    Optional ID suffix and style overrides.
 */
export function drawFixedRadiusFromFeature(
  map: MLMap,
  feature: PolygonFeature,
  { idSuffix, fillColor = "#2563eb", fillOpacity = 0.15, strokeColor = "#1d4ed8", strokeWidth = 2 }: IdOpts & StyleOpts = {}
) {
  const { SRC_ID, FILL_ID, LINE_ID } = ids(idSuffix);
  const fc = { type: "FeatureCollection", features: [feature] };

  if (map.getSource(SRC_ID)) (map.getSource(SRC_ID) as any).setData(fc);
  else map.addSource(SRC_ID, { type: "geojson", data: fc } as any);

  if (!map.getLayer(FILL_ID)) {
    map.addLayer({
      id: FILL_ID,
      type: "fill",
      source: SRC_ID,
      paint: { "fill-color": fillColor, "fill-opacity": fillOpacity },
    } as any);
  }
  if (!map.getLayer(LINE_ID)) {
    map.addLayer({
      id: LINE_ID,
      type: "line",
      source: SRC_ID,
      paint: { "line-color": strokeColor, "line-width": strokeWidth },
    } as any);
  }
}

/**
 * Convenience helper: compute a new fixed-radius polygon for a given center,
 * remove any existing ring with the same ID suffix, draw the new one, and return it.
 *
 * Typical usage from a click handler:
 * ```ts
 * const poly = replaceFixedRadiusFromCenter(map, [lng, lat], 3, { idSuffix: "-schools" });
 * ```
 *
 * @param map          MapLibre map instance.
 * @param center       LngLatLike center of the circle.
 * @param radiusMiles  Radius in miles.
 * @param opts         Optional id suffix + style/steps overrides.
 * @returns            The newly computed GeoJSON Feature<Polygon>.
 */
export function replaceFixedRadiusFromCenter(
  map: MLMap,
  center: LngLatLike,
  radiusMiles: number,
  opts: IdOpts & StyleOpts = {}
): PolygonFeature {
  const poly = computeFixedRadiusPolygon(center, radiusMiles, opts.steps ?? 128);
  clearFixedRadius(map, opts);
  drawFixedRadiusFromFeature(map, poly, opts);
  return poly;
}