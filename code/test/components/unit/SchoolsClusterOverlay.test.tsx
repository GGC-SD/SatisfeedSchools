// Test for user story LEC-2:
// As a user, I need to see all the schools represented as a marker

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock Firebase so it returns 3 fake schools
vi.mock("@/firebase/firebaseConfig", () => ({ db: {} as any }));
vi.mock("firebase/firestore", () => {
  const docs = [
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
  ];
  return {
    collection: vi.fn(),
    query: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({ docs }),
  };
});

import SchoolsClusterOverlay from "@/app/dashboard-insights/components/map/overlays/SchoolsClusterOverlay";

// Create a fake MapLibre map object for testing
function makeFakeMap() {
  const addedSources: Record<string, any> = {};
  const addedLayers: Array<{ id: string; def: any }> = [];

  const map = {
    isStyleLoaded: vi.fn(() => true), // pretend map is ready
    addSource: vi.fn((id: string, def: any) => {
      addedSources[id] = def;
    }),
    addLayer: vi.fn((def: any) => {
      addedLayers.push({ id: def.id, def });
    }),
    getLayer: vi.fn((id: string) => addedLayers.find((l) => l.id === id)),
    getSource: vi.fn((id: string) => addedSources[id]),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getCanvas: vi.fn(() => ({ style: { cursor: "" } })),
    queryRenderedFeatures: vi.fn(),
    easeTo: vi.fn(),
  } as any;

  return { map, addedSources, addedLayers };
}

describe("User Story: See all schools as markers", () => {
  let ctx: ReturnType<typeof makeFakeMap>;

  beforeEach(() => {
    ctx = makeFakeMap(); // reset fake map before each test
  });

  it("adds a GeoJSON source with school points and an unclustered point layer", async () => {
    // Render the overlay component with our fake map
    render(
      <SchoolsClusterOverlay
        map={ctx.map}
        idSuffix="-test"
        onAreaSelect={() => {}}
      />
    );

    await waitFor(() => {
      // Check that the GeoJSON source for schools was added
      expect(ctx.map.addSource).toHaveBeenCalledWith(
        "schools-test",
        expect.objectContaining({ type: "geojson", cluster: true })
      );

      // Check that the unclustered circle markers were added
      const layer = ctx.addedLayers.find(
        (l) => l.id === "unclustered-point-test"
      );
      expect(layer).toBeTruthy();
      expect(layer?.def.type).toBe("circle");
    });

    // Verify the source data includes 3 school features
    const sourceArg = (ctx.map.addSource as any).mock.calls.find(
      ([id]: [string, any]) => id === "schools-test"
    )?.[1];

    expect(sourceArg.data?.type).toBe("FeatureCollection");
    expect(sourceArg.data?.features?.length).toBe(3);
  });
});
