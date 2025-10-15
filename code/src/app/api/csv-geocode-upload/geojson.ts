/**
 * GeoJSON builder for MapLibre heatmap.
 * Each bin becomes a Point feature with properties.weight.
 */
import type { Bin } from "./aggregate";

export type Feature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { weight: number };
};

export type FeatureCollection = {
  type: "FeatureCollection";
  features: Feature[];
};

export function toFeatureCollection(bins: Bin[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: bins.map((b) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [b.lon, b.lat] },
      properties: { weight: b.weight },
    })),
  };
}