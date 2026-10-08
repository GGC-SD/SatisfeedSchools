import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/dashboard-insights/components/displays/school-display", () => ({
  default: () => <div>School view</div>,
}));

vi.mock("@/app/dashboard-insights/components/displays/library-display", () => ({
  default: () => <div>Library view</div>,
}));

vi.mock("@/app/dashboard-insights/components/map/dashboard-pantry-map", () => ({
  default: () => <div>Pantry map skeleton</div>,
}));

import DashboardContentDisplay from "@/app/dashboard-insights/components/dashboard-content-display";

describe("Dashboard pantry tab", () => {
  it("routes the Pantry tab to the pantry map instead of the library view", () => {
    render(<DashboardContentDisplay />);

    fireEvent.click(screen.getByRole("tab", { name: "Pantry" }));

    expect(screen.getByText("Pantry map skeleton")).toBeTruthy();
    expect(screen.queryByText("Library view")).toBeNull();
    expect(
      screen.getByRole("tab", { name: "Pantry" }).getAttribute("aria-selected")
    ).toBe("true");
  });
});
