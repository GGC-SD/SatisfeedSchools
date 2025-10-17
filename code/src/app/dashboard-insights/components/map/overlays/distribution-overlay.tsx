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

type Props = {
  map: MLMap | null;
  // URL to FeatureCollection<Point> with { weight }
  geojsonUrl: string;
  // Circle radius in meters
  privacyRadiusMeters?: number;
  // Optional jitter in meters (0 = off)
  jitterMeters?: number;
  // Optional unique suffix if mounting multiple overlays
  idSuffix?: string;
};

export default function DistributionOverlay({
  map,
  geojsonUrl,
  privacyRadiusMeters = 500,
  jitterMeters = 0,
  idSuffix = "",
}: Props) {
  useEffect(() => {
    if (!map) return;
    const m = map;

    const SRC_ID = `privacy-src${idSuffix}`;
    const FILL_ID = `privacy-fill${idSuffix}`;
    const OUTLINE_ID = `privacy-outline${idSuffix}`;

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

      // 2) buffer (and jitter) -> circles (Polygon)
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
        const weight = (f.properties?.weight as number | undefined) ?? 0;
        circle.properties ??= {};
        circle.properties.weight = weight;

        circles.push(
          circle as unknown as GJFeature<Polygon, GeoJsonProperties>
        );
      }

      if (circles.length === 0) {
        try {
          if (m.getLayer(OUTLINE_ID)) m.removeLayer(OUTLINE_ID);
          if (m.getLayer(FILL_ID)) m.removeLayer(FILL_ID);
          if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
        } catch {}
        return;
      }

      // 3) Build FC<Polygon> for dissolve (inputs are polygons)
      const fcForDissolve: GJFeatureCollection<Polygon, GeoJsonProperties> = {
        type: "FeatureCollection",
        features: circles.map((g) => {
          g.properties ??= {};
          (g.properties as any).__grp = 1;
          return g;
        }),
      };

      // 4) Dissolve with safe casts; ALWAYS normalize to FeatureCollection<Polygon | MultiPolygon>
      let dissolvedFC: GJFeatureCollection<
        Polygon | MultiPolygon,
        GeoJsonProperties
      >;

      try {
        // Turf types vary across versions; use any to avoid mismatch errors
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
          // Unexpected shape → fallback to original circles without dissolve
          dissolvedFC = {
            type: "FeatureCollection",
            features: fcForDissolve.features as unknown as GJFeature<
              Polygon | MultiPolygon,
              GeoJsonProperties
            >[],
          };
        }
      } catch {
        // 5) Fallback: pairwise union with safe casts; still normalize to FC
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
            // skip failed unions
          }
        }

        dissolvedFC = merged
          ? { type: "FeatureCollection", features: [merged] }
          : { type: "FeatureCollection", features: [] };
      }

      // 6) replace source/layers
      try {
        if (m.getLayer(OUTLINE_ID)) m.removeLayer(OUTLINE_ID);
        if (m.getLayer(FILL_ID)) m.removeLayer(FILL_ID);
        if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
      } catch {}

      m.addSource(SRC_ID, {
        type: "geojson",
        data: dissolvedFC,
      } as any);

      m.addLayer({
        id: FILL_ID,
        type: "fill",
        source: SRC_ID,
        paint: {
          //"fill-color": "rgba(247, 206, 22)",
          "fill-color": "#ff7512",
          "fill-opacity": 0.65,
        },
      });

      m.addLayer({
        id: OUTLINE_ID,
        type: "line",
        source: SRC_ID,
        paint: {
          "line-color": "#d6670d",
          "line-opacity": 0.25,
          "line-width": 1.25, 
        },
      });
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
        if (m.getLayer(OUTLINE_ID)) m.removeLayer(OUTLINE_ID);
        if (m.getLayer(FILL_ID)) m.removeLayer(FILL_ID);
        if (m.getSource(SRC_ID)) m.removeSource(SRC_ID);
      } catch {}
    };
  }, [map, geojsonUrl, privacyRadiusMeters, jitterMeters, idSuffix]);

  return null;
}
