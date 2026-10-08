import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const radiusMocks = vi.hoisted(() => ({
  clearFixedRadius: vi.fn(),
  replaceFixedRadiusFromCenter: vi.fn(),
}));

vi.mock("@/app/dashboard-insights/components/displays/pantry-display", () => ({
  default: () => <div>Pantry map skeleton</div>,
}));

vi.mock("maplibre-gl", () => {
  class MapMock {
    container: HTMLElement;

    constructor(options: { container: HTMLElement }) {
      this.container = options.container;
    }

    addControl() {}
    resize() {}
    remove() {}
    getLayer() {
      return undefined;
    }
    removeLayer() {}
    getSource() {
      return undefined;
    }
    removeSource() {}
    addSource() {}
    addLayer() {}
    on(event: string, handler: () => void) {
      if (event === "load") handler();
    }
    off() {}
  }

  class MarkerMock {
    element: HTMLElement;

    constructor(options: { element: HTMLElement }) {
      this.element = options.element;
    }

    setLngLat() {
      return this;
    }

    addTo(map: MapMock) {
      map.container.appendChild(this.element);
      return this;
    }

    remove() {
      this.element.remove();
    }
  }

  const maplibreModule = {
    Map: MapMock,
    Marker: MarkerMock,
    NavigationControl: class NavigationControl {},
    ScaleControl: class ScaleControl {},
  };

  return { ...maplibreModule, default: maplibreModule };
});

import DashboardPantryMap, {
  PantryLocation,
} from "@/app/dashboard-insights/components/map/dashboard-pantry-map";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const pantry: PantryLocation = {
  id: "pantry-1",
  name: "Community Pantry",
  address: "10 Main Street",
  email: "contact@example.org",
  coordinates: { lat: 33.95, lng: -84.07 },
  serviceRadiusMiles: 3,
  affectedSchools: ["North School"],
  foodStats: { mealsAvailable: 120 },
};

describe("DashboardPantryMap", () => {
  const originalKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_MAPTILER_KEY = "test-key";
    globalThis.ResizeObserver = ResizeObserverMock;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MAPTILER_KEY = originalKey;
  });

  it("renders its legend but no marker buttons without pantry data", () => {
    render(<DashboardPantryMap />);

    expect(screen.getByTestId("pantry-map-legend")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /view pantry details/i })
    ).toBeNull();
  });

  it("creates accessible markers only for valid coordinate pairs", async () => {
    render(
      <DashboardPantryMap
        pantries={[
          pantry,
          { id: "missing-coordinates", name: "Missing Coordinates" },
          {
            id: "invalid-coordinates",
            name: "Invalid Coordinates",
            coordinates: { lat: Number.NaN, lng: -84 },
          },
        ]}
      />
    );

    expect(
      await screen.findByRole("button", {
        name: "View pantry details for Community Pantry",
      })
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Missing Coordinates/ })
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Invalid Coordinates/ })
    ).toBeNull();
  });

  it("opens the information box from a marker and clears the selection", async () => {
    render(<DashboardPantryMap pantries={[pantry]} />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "View pantry details for Community Pantry",
      })
    );

    expect(screen.getByTestId("pantry-information-box")).toBeTruthy();
    expect(screen.getByText("Community Pantry")).toBeTruthy();
    expect(screen.getByText("10 Main Street")).toBeTruthy();
    expect(screen.getByText("contact@example.org")).toBeTruthy();
    expect(screen.getByText("North School")).toBeTruthy();
    expect(screen.getByText("120")).toBeTruthy();
    expect(radiusMocks.replaceFixedRadiusFromCenter).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Clear selected pantry" })
    );

    expect(screen.queryByTestId("pantry-information-box")).toBeNull();
    expect(radiusMocks.clearFixedRadius).toHaveBeenCalled();
  });

  it("shows neutral fallbacks instead of missing values", async () => {
    render(
      <DashboardPantryMap
        pantries={[
          {
            id: "pantry-with-gaps",
            coordinates: { lat: 33.9, lng: -84.1 },
          },
        ]}
      />
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "View pantry details for food pantry",
      })
    );

    expect(screen.getAllByText("Not provided")).toHaveLength(4);
    expect(screen.getByText("No affected-school data")).toBeTruthy();
    expect(screen.getByText("No food-stat data")).toBeTruthy();
  });

  it("replaces markers without duplicating them when pantry data changes", async () => {
    const { rerender } = render(<DashboardPantryMap pantries={[pantry]} />);

    expect(
      await screen.findAllByRole("button", { name: /view pantry details/i })
    ).toHaveLength(1);

    rerender(
      <DashboardPantryMap
        pantries={[
          {
            ...pantry,
            id: "pantry-2",
            name: "Second Pantry",
          },
        ]}
      />
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /view pantry details/i })
      ).toHaveLength(1);
    });
    expect(
      screen.getByRole("button", {
        name: "View pantry details for Second Pantry",
      })
    ).toBeTruthy();
  });
});
