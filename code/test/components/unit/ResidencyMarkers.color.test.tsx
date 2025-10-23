// Test for user story LEC-5:
// As a user, I need to see food distribution residencies represented as a different color marker.

// This test checks that school markers and residency coverage
// use different colors so users can visually tell them apart.
// schools should be red and heatmap should be yellow

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import SchoolsClusterOverlay from "@/app/dashboard-insights/components/map/overlays/SchoolsClusterOverlay";
import DistributionOverlay from "@/app/dashboard-insights/components/map/overlays/distribution-overlay";

vi.mock("@/firebase/firebaseConfig", () => ({ db: {} as any }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({
    docs: [
      {
        id: "s1",
        data: () => ({ name: "A", coords: { lat: 33.9, lng: -84.0 } }),
      },
      {
        id: "s2",
        data: () => ({ name: "B", coords: { lat: 33.8, lng: -84.1 } }),
      },
      {
        id: "s3",
        data: () => ({ name: "C", coords: { lat: 33.7, lng: -84.2 } }),
      },
    ],
  }),
}));

// fake map
function makeFakeMap() {
  const addedLayers: Array<{ id: string; def: any }> = [];
  const addedSources: Record<string, any> = {};

  const map = {
    isStyleLoaded: vi.fn(() => true),
    addSource: vi.fn((id, def) => (addedSources[id] = def)),
    addLayer: vi.fn((def) => addedLayers.push({ id: def.id, def })),
    getLayer: vi.fn((id) => addedLayers.find((l) => l.id === id)),
    getSource: vi.fn((id) => addedSources[id]),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getCanvas: vi.fn(() => ({ style: { cursor: "" } })),
    queryRenderedFeatures: vi.fn(() => []),
    easeTo: vi.fn(),
  } as any;

  return { map, addedLayers };
}

describe("LEC-5: Residency polygon fill color differs from school marker color", () => {
  let ctx: ReturnType<typeof makeFakeMap>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    ctx = makeFakeMap();

    // Mock GeoJSON fetch for residencies
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-84.0, 33.9] },
          },
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-84.05, 33.95] },
          },
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-84.1, 33.9] },
          },
        ],
      }),
    } as any);
  });

  afterEach(() => {
    global.fetch = originalFetch; // Reset fetch back to normal
  });

  it("compares school circle color vs residency polygon fill color", async () => {
    // Render the school markers first
    render(<SchoolsClusterOverlay map={ctx.map as any} idSuffix="-schools" />);

    // Render residency coverage second (residency layer = filled polygon)
    render(
      <DistributionOverlay
        map={ctx.map as any}
        geojsonUrl="/fake-residencies.json"
        idSuffix="-res"
        privacyRadiusMeters={500}
        jitterMeters={0}
      />
    );

    // Wait until school circle layer is created
    await waitFor(() => {
      const schoolMarkers = ctx.addedLayers.find(
        (l) => l.id === "unclustered-point-schools"
      );
      expect(schoolMarkers).toBeTruthy();
      expect(schoolMarkers?.def.type).toBe("circle");
    });

    // Wait until residency polygon layer is created
    await waitFor(() => {
      const residencyFill = ctx.addedLayers.find(
        (l) => l.id === "privacy-fill-res"
      );
      expect(residencyFill).toBeTruthy();
      expect(residencyFill?.def.type).toBe("fill");
    });

    // Get both colors from the map layers
    const schoolColor = ctx.addedLayers.find(
      (l) => l.id === "unclustered-point-schools"
    )!.def.paint["circle-color"];
    const residencyFillColor = ctx.addedLayers.find(
      (l) => l.id === "privacy-fill-res"
    )!.def.paint["fill-color"];

    // Confirm both exist and are not the same
    expect(schoolColor).toBeTruthy();
    expect(residencyFillColor).toBeTruthy();
    expect(residencyFillColor).not.toEqual(schoolColor);
  });
});
