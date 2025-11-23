import React from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import LibrariesClusterOverlay from "@/app/dashboard-insights/components/map/overlays/LibrariesClusterOverlay";
import type { Firestore } from "firebase/firestore";

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual<typeof import("firebase/firestore")>(
    "firebase/firestore"
  );

  return {
    ...actual,
    collection: vi.fn((db: Firestore, name: string) => ({ db, name })),
    query: vi.fn((c: any) => c),
    getDocs: vi.fn(async () => ({
      docs: [
        {
          id: "lib-1",
          data: () => ({
            name: "Lawrenceville Library",
            address: "123 Main St",
            city: "Lawrenceville",
            county: "Gwinnett",
            state: "GA",
            zip: "30044",
            phone: "555-1234",
            website: "https://example.com",
            coords: { lat: 33.94, lng: -84.0 },
          }),
        },
      ],
    })),
  };
});

function makeFakeMap() {
  const addedSources: Record<string, any> = {};
  const addedLayers: Array<{ id: string; def: any }> = [];
  const canvasAttrs: Record<string, string> = {};

  const canvas = {
    style: { cursor: "" },
    setAttribute: vi.fn((key: string, value: string) => {
      canvasAttrs[key] = value;
    }),
    getAttribute: vi.fn((key: string) => canvasAttrs[key]),
  } as any;

  const map = {
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
    isStyleLoaded: vi.fn(() => true),
    on: vi.fn(),
    off: vi.fn(),
    getCanvas: vi.fn(() => canvas),
  } as any;

  return { map, canvas, canvasAttrs, addedSources, addedLayers };
}

describe("LibrariesClusterOverlay", () => {
  let ctx: ReturnType<typeof makeFakeMap>;

  beforeEach(() => {
    ctx = makeFakeMap();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a libraries source, layers, and marks canvas attributes", async () => {
    render(<LibrariesClusterOverlay map={ctx.map} />);

    await waitFor(() => {
      expect(ctx.addedSources?.["libraries-src-libraries"]).toBeTruthy();
    });

    const src = ctx.addedSources["libraries-src-libraries"];
    expect(src).toBeTruthy();
    expect(src.data.features).toHaveLength(1);

    const ptLayerId = "libraries-unclustered-libraries";
    expect(ctx.addedLayers.some((l) => l.id === ptLayerId)).toBe(true);

    expect(
      ctx.addedLayers.some((l) => l.id === "libraries-clusters-libraries")
    ).toBe(true);
    expect(
      ctx.addedLayers.some((l) => l.id === "libraries-cluster-count-libraries")
    ).toBe(true);

    expect(ctx.canvas.setAttribute).toHaveBeenCalledWith(
      "data-has-libraries",
      "true"
    );
    expect(ctx.canvas.setAttribute).toHaveBeenCalledWith(
      "data-libraries-count",
      "1"
    );
  });

  it("registers click handlers for points and clusters", async () => {
    render(<LibrariesClusterOverlay map={ctx.map} />);

    await waitFor(() => {
      expect(ctx.map.on).toHaveBeenCalled();
    });

    const onCalls = (ctx.map.on as any).mock.calls;
    const clickPoint = onCalls.find(
      ([evt, layerId]: [string, string]) =>
        evt === "click" && String(layerId).includes("libraries-unclustered")
    );

    const clickCluster = onCalls.find(
      ([evt, layerId]: [string, string]) =>
        evt === "click" && String(layerId).includes("libraries-clusters")
    );

    expect(clickPoint).toBeTruthy();
    expect(clickCluster).toBeTruthy();
  });
});
