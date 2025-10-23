// Test for user story LEC-28:
// As a user, I want the ability to dynamically search counties/zip within the dropdowns

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchableDropdown from "@/app/dashboard-insights/components/filters/searchable-dropdown";
import { vi, describe, it, expect } from "vitest";

// Mock the CSV that would normally come from fetch()
function mockCsv() {
  const csv = [
    "zip,county",
    "30043,Gwinnett",
    "30045,Gwinnett",
    "30303,Fulton",
    "30306,Fulton",
    "30030,Dekalb",
  ].join("\n");

  // Pretend fetch() returns above CSV
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    text: async () => csv,
  } as any);
}

describe("LEC-28: dynamically search counties/ZIPs in dropdowns", () => {
  beforeEach(() => {
    vi.restoreAllMocks(); // Reset mocks
    mockCsv(); // Load fake CSV
  });

  it("filters counties by text, then filters ZIPs and emits correct selections", async () => {
    // Spy on callback
    const onBoundarySelect = vi.fn();

    // Render real dropdown component
    render(<SearchableDropdown onBoundarySelect={onBoundarySelect} />);

    const user = userEvent.setup();

    //  County search
    const countyInput = await screen.findByPlaceholderText(
      "Select a county..."
    );
    await user.click(countyInput); // open dropdown
    await user.type(countyInput, "gwin"); // type to filter

    const gwinnettOption = await screen.findByRole("option", {
      name: "Gwinnett",
    });
    await user.click(gwinnettOption); // select county

    // Expect correct county emitted
    await waitFor(() =>
      expect(onBoundarySelect).toHaveBeenCalledWith({
        type: "county",
        countyName: "Gwinnett",
      })
    );

    // Zip search
    const zipInput = await screen.findByPlaceholderText("Select a ZIP code");
    await user.click(zipInput);
    await user.type(zipInput, "3004"); // filter ZIPs

    const zipOption = await screen.findByRole("option", { name: "30045" });
    await user.click(zipOption); // select ZIP

    // Expect correct ZIP
    await waitFor(() =>
      expect(onBoundarySelect).toHaveBeenCalledWith({
        type: "zip",
        countyName: "Gwinnett",
        zcta: "30045",
      })
    );
  });
});
