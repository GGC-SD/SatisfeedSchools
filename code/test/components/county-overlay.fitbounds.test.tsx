// Test for user story LEC-48:
// As a user, when I filter by County / ZIP code I expect the map to move to that location
// This file tests that CountyOverlay actually moves the map
// when a valid county or zip is selected

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import CountyOverlay from "@/app/dashboard-insights/components/map/overlays/county-overlay";

/**
 * Normalize any kind of bounds format to:
 *   [[minX, minY], [maxX, maxY]]
 * CountyOverlay internally might use 4-number format like [0,0,1,1]
 * so this keeps our test flexible.
 */
function normalizeBounds(b: any) {
  return Array.isArray(b?.[0])
    ? b
    : [
        [b[0], b[1]],
        [b[2], b[3]],
      ];
}

function makeFakeMap() {
  const addedSources: Record<string, any> = {};
  const addedLayers: Array<{ id: string; def: any }> = [];

  const map = {
    addSource: vi.fn((id: string, def: any) => (addedSources[id] = def)),
    addLayer: vi.fn((def: any) => addedLayers.push({ id: def.id, def })),
    getLayer: vi.fn((id: string) => addedLayers.find((l) => l.id === id)),
    getSource: vi.fn((id: string) => addedSources[id]),
    removeLayer: vi.fn((id: string) => {
      const idx = addedLayers.findIndex((l) => l.id === id);
      if (idx >= 0) addedLayers.splice(idx, 1);
    }),
    removeSource: vi.fn((id: string) => delete addedSources[id]),
    on: vi.fn(),
    off: vi.fn(),
    fitBounds: vi.fn(),
  } as any;

  return { map, addedSources, addedLayers };
}

/**
 * Builds a simple 1x1 GeoJSON square polygon.
 * Bounding box is always [0,0,1,1].
 * We pass in custom properties so the overlay can match NAME or zcta.
 */
const squareFeature = (props: Record<string, any> = {}) => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { ...props },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    },
  ],
});

describe("LEC-48: Move map to selected County/ZIP", () => {
  let ctx: ReturnType<typeof makeFakeMap>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    ctx = makeFakeMap();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("fits bounds when a County is selected (matches properties.NAME)", async () => {
    // CountyOverlay will fetch `/data/ga-counties.geojson`
    // We mock ONLY that URL to return 1 feature with NAME = Gwinnett
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (String(url).endsWith("/data/ga-counties.geojson")) {
        return {
          ok: true,
          json: async () =>
            squareFeature({
              NAME: "Gwinnett", // Overlay compares this with countyName
            }),
        } as any;
      }
      throw new Error("Unexpected fetch: " + url);
    });

    // Render the overlay with a county selection
    render(
      <CountyOverlay
        map={ctx.map}
        selection={{ type: "county", countyName: "Gwinnett" }}
      />
    );

    // Wait for async fetch + map.fitBounds to happen
    await waitFor(() => {
      expect(ctx.map.fitBounds).toHaveBeenCalled();
    });

    // Check what bounds were used
    const [boundsArg, optsArg] = (ctx.map.fitBounds as any).mock.calls[0];
    expect(normalizeBounds(boundsArg)).toEqual([
      [0, 0],
      [1, 1],
    ]); // correct bbox
    expect(optsArg).toMatchObject({
      padding: expect.any(Object),
      duration: expect.any(Number),
    });

    expect(ctx.map.getSource("selection-boundary-src")).toBeTruthy();
    expect(ctx.map.getLayer("selection-boundary-fill")).toBeTruthy();
    expect(ctx.map.getLayer("selection-boundary-line")).toBeTruthy();
  });

  it("fits bounds when a ZIP is selected (matches properties.zcta)", async () => {
    // Overlay fetches `/data/zips/ga-zips-gwinnett.geojson`
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (String(url).endsWith("/data/zips/ga-zips-gwinnett.geojson")) {
        return {
          ok: true,
          json: async () =>
            squareFeature({
              zcta: "30045", // overlay matches this to selection.zcta
            }),
        } as any;
      }
      throw new Error("Unexpected fetch: " + url);
    });

    // Render overlay for ZIP scenario
    render(
      <CountyOverlay
        map={ctx.map}
        selection={{ type: "zip", countyName: "Gwinnett", zcta: "30045" }}
      />
    );

    // Should also trigger fitBounds
    await waitFor(() => {
      expect(ctx.map.fitBounds).toHaveBeenCalled();
    });

    const [boundsArg] = (ctx.map.fitBounds as any).mock.calls[0];
    expect(normalizeBounds(boundsArg)).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });
});
