"use client";

import { useEffect } from "react";
import type { Map as MLMap } from "maplibre-gl";

type Props = {
  map: MLMap | null;
  url?: string; // GA polygon/multipolygon GeoJSON
  lineColor?: string; // outline color
  lineWidth?: number; // px at mid zoom (we scale with zoom)
  showHalo?: boolean; // thin white halo for contrast
};

export default function GeorgiaOutlineOverlay({
  map,
  url = "/data/georgia-boundary.geojson",
  lineColor = "#000000",
  lineWidth = 4,
  showHalo = true,
}: Props) {
  useEffect(() => {
    if (!map) return;
    const m = map;

    const SRC = "ga-outline-src";
    const HALO = "ga-outline-halo";
    const LINE = "ga-outline-line";

    let aborted = false;

    async function draw() {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        console.error("[GA Outline] fetch failed:", res.status, res.statusText);
        return;
      }
      const data = await res.json();
      if (aborted) return;

      // Remove prior layers/sources
      try {
        if (m.getLayer(LINE)) m.removeLayer(LINE);
      } catch {}
      try {
        if (m.getLayer(HALO)) m.removeLayer(HALO);
      } catch {}
      try {
        if (m.getSource(SRC)) m.removeSource(SRC);
      } catch {}

      m.addSource(SRC, { type: "geojson", data } as any);

      // Optional thin white halo for contrast (no blur, very clean)
      if (showHalo) {
        m.addLayer({
          id: HALO,
          type: "line",
          source: SRC,
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#ffffff",
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              5,
              lineWidth + 1.5,
              10,
              lineWidth + 2,
              14,
              lineWidth + 3,
            ],
            "line-opacity": 1,
          },
        } as any);
      }

      // Main outline — solid, rounded, no dash, no blur
      m.addLayer({
        id: LINE,
        type: "line",
        source: SRC,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": lineColor,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            lineWidth,
            10,
            lineWidth + 1,
            14,
            lineWidth + 2,
          ],
          "line-opacity": 1,
        },
      } as any);

      // Keep on top
      try {
        const layers = m.getStyle().layers ?? [];
        const topId = layers[layers.length - 1]?.id;
        if (topId) {
          if (showHalo) m.moveLayer(HALO, topId);
          m.moveLayer(LINE, topId);
        }
      } catch {}
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
        if (m.getLayer(LINE)) m.removeLayer(LINE);
      } catch {}
      try {
        if (m.getLayer(HALO)) m.removeLayer(HALO);
      } catch {}
      try {
        if (m.getSource(SRC)) m.removeSource(SRC);
      } catch {}
    };
  }, [map, url, lineColor, lineWidth, showHalo]);

  return null;
}
