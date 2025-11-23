import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import KeyOverlay from "@/app/dashboard-insights/components/map/overlays/key-overlay";

describe("KeyOverlay", () => {
  it("renders the legend and shared items", () => {
    render(<KeyOverlay currentMap="school" />);

    // Legend heading
    expect(screen.getByText("Legend")).toBeTruthy();

    // Shared elements
    expect(screen.getByText("Selected Area")).toBeTruthy();
    expect(screen.getByText("Unique Households Served")).toBeTruthy();

    // Swatch testId
    expect(screen.getByTestId("legend-unique-households-swatch")).toBeTruthy();
  });

  it("shows school-specific legend items when currentMap='school'", () => {
    render(<KeyOverlay currentMap="school" />);

    expect(screen.getByText("Single School")).toBeTruthy();
    expect(screen.getByText("School Cluster")).toBeTruthy();
    expect(screen.getByText("Selected School")).toBeTruthy();
    expect(screen.getByText("School Impact Zone")).toBeTruthy();
  });

  it("shows library-specific legend items when currentMap='library'", () => {
    render(<KeyOverlay currentMap="library" />);

    expect(screen.getByText("Single Library")).toBeTruthy();
    expect(screen.getByText("Library Cluster")).toBeTruthy();
    expect(screen.getByText("Selected Library")).toBeTruthy();
    expect(screen.getByText("Library Impact Zone")).toBeTruthy();
  });
});
