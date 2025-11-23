import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("maplibre-gl", () => {
  return {
    Map: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      off: vi.fn(),
      remove: vi.fn(),
      addControl: vi.fn(),
      resize: vi.fn(),
      getCanvas: vi.fn(() => ({
        style: {},
        setAttribute: vi.fn(),
        getAttribute: vi.fn(),
      })),
    })),
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
    LngLat: { convert: vi.fn((v) => v) },
    LngLatBounds: vi.fn(),
  };
});

import DashboardLibraryMap from "@/app/dashboard-insights/components/map/dashboard-library-map";

describe("DashboardLibraryMap (library view)", () => {
  const originalKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_MAPTILER_KEY = "";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MAPTILER_KEY = originalKey;
  });

  it("renders the map container and legend", () => {
    render(
      <DashboardLibraryMap
        className="test-map"
        geojsonUrl={undefined}
        boundarySelection={null}
      />
    );

    expect(document.querySelector(".library-map")).toBeTruthy();

    expect(screen.getByTestId("legend-key")).toBeTruthy();

    expect(screen.getByText("Single Library")).toBeTruthy();
    expect(screen.getByText("Library Cluster")).toBeTruthy();
    expect(screen.getByText("Selected Library")).toBeTruthy();
    expect(screen.getByText("Library Impact Zone")).toBeTruthy();
  });
});
