// Test for user story LEC-26:
// As a user, I want to see recent school data that as been pulled from a reliable source

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import DataCard from "@/app/dashboard-insights/components/ui/data-card";

describe("LEC-27: DataCard component", () => {
  // Placeholder should show if no school is selected
  it("shows placeholder when no school is selected", () => {
    render(<DataCard title="" value={0} />);
    expect(screen.getByText("Select a School To Begin")).toBeInTheDocument();
  });

  // Should display the selected school's info
  it("displays school name and household count when title is provided", () => {
    render(<DataCard title="Meadowcreek High" value={1200} />);
    expect(
      screen.getByRole("heading", { name: /Meadowcreek High/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Households: 1200/i)).toBeInTheDocument();
  });

  // Should trigger the clear action when button is clicked
  it("calls onClear when button is clicked", () => {
    const handleClear = vi.fn();
    render(
      <DataCard title="Brookwood High" value={950} onClear={handleClear} />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /clear selected school/i })
    );
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
