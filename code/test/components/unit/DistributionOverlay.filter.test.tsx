// Test for user story LEC-6:
// As a user, I need to be able to filter data in proximity to landmarks to view hotspots of customer locations

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import DistributionOverlay from "@/app/dashboard-insights/components/map/overlays/distribution-overlay";

// Fake Map object
function makeFakeMap() {
  const addedSources: Record<string, any> = {};
  const addedLayers: Array<{ id: string; def: any }> = [];

  const map = {
    isStyleLoaded: vi.fn(() => true), // pretend map is ready
    addSource: vi.fn((id: string, def: any) => (addedSources[id] = def)), // record sources added
    addLayer: vi.fn((def: any) => addedLayers.push({ id: def.id, def })), // record layers added
    getLayer: vi.fn((id: string) => addedLayers.find((l) => l.id === id)),
    getSource: vi.fn((id: string) => addedSources[id]),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  } as any;

  return { map, addedSources, addedLayers };
}

describe("LEC-6: As a user, I need to be able to filter data in proximity to landmarks to view hotspots of customer locations", () => {
  let ctx: ReturnType<typeof makeFakeMap>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    ctx = makeFakeMap();

    // Pretend our data file returns 3 customer points:
    // - 2 inside the selected area
    // - 1 outside the selected area
    const pointsFC = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0.25, 0.25] },
          properties: {},
        }, // inside
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0.75, 0.75] },
          properties: {},
        }, // inside
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [2, 2] },
          properties: {},
        }, // outside
      ],
    };

    // Mock fetch() so the component gets our fake points
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(pointsFC),
    } as any);
  });

  afterEach(() => {
    global.fetch = originalFetch; // restore real fetch
  });

  it("counts only points within selected area and renders hotspot layers", async () => {
    // The selected area (near a landmark) — a 1x1 square from (0,0) to (1,1)
    const selectedArea = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
      properties: {},
    } as any;

    // We watch this callback to see how many points are counted inside the area
    const onHouseholdCount = vi.fn();

    // Render the overlay with:
    // - our fake map
    // - fake data url
    // - selected area (the “proximity” filter)
    // - callback to receive the inside-count
    render(
      <DistributionOverlay
        map={ctx.map}
        geojsonUrl="/fake-data.json"
        idSuffix="-test"
        selectedArea={selectedArea}
        onHouseholdCount={onHouseholdCount}
        privacyRadiusMeters={500}
        jitterMeters={0}
      />
    );

    // Expect only the 2 inside points to be counted
    await waitFor(() => {
      expect(onHouseholdCount).toHaveBeenCalledWith(2);
    });

    // Expect hotspot layers to be drawn on the map:
    //    - a filled shape (heat/coverage)
    //    - an outline around it
    await waitFor(() => {
      const fillLayer = ctx.addedLayers.find(
        (l) => l.id === "privacy-fill-test"
      );
      const outlineLayer = ctx.addedLayers.find(
        (l) => l.id === "privacy-outline-test"
      );
      expect(fillLayer?.def.type).toBe("fill");
      expect(outlineLayer?.def.type).toBe("line");
    });
  });
});
