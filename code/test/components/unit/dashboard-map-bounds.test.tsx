// Test for user story LEC-27:
// As a user, I want to only see data within the scope of Georgia.

import React from "react";
import { render } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

// Ensure env key exists so the map initializes in tests
process.env.NEXT_PUBLIC_MAPTILER_KEY =
  process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "test-key";

// Polyfill ResizeObserver for jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver =
  (globalThis as any).ResizeObserver ?? ResizeObserverMock;

// Stub Firebase (used by overlays)
vi.mock("@/firebase/firebaseConfig", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn(),
}));

// Mock maplibre-gl: constructor + controls
vi.mock("maplibre-gl", () => {
  const makeMapInstance = () => ({
    addControl: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    resize: vi.fn(),
  });

  const Map = vi.fn().mockImplementation(() => makeMapInstance());
  const NavigationControl = vi.fn();
  const GeolocateControl = vi.fn();
  const ScaleControl = vi.fn();
  const FullscreenControl = vi.fn();
  const AttributionControl = vi.fn();

  return {
    __esModule: true,
    default: {
      Map,
      NavigationControl,
      GeolocateControl,
      ScaleControl,
      FullscreenControl,
      AttributionControl,
    },
    Map,
    NavigationControl,
    GeolocateControl,
    ScaleControl,
    FullscreenControl,
    AttributionControl,
  };
});

import maplibregl from "maplibre-gl";
import DashboardSchoolsMap from "@/app/dashboard-insights/components/map/dashboard-schools-map";

describe("LEC-XX: Restrict map to Georgia bounds", () => {
  it("passes GA_BOUNDS to Map constructor via maxBounds", () => {
    render(<DashboardSchoolsMap />);

    const MapMock: any = (maplibregl as any).Map;
    expect(MapMock).toHaveBeenCalledTimes(1);

    const opts = MapMock.mock.calls[0][0];
    expect(opts.maxBounds).toEqual([
      [-86.33327, 29.658835],
      [-80.02333, 35.697465],
    ]);

    // Sanity checks
    expect(opts.renderWorldCopies).toBe(false);
    expect(opts.center).toEqual([-84.07, 33.95]);
  });
});
