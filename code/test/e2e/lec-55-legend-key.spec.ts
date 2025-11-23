import { test, expect } from "@playwright/test";

test.describe("LEC-55: Legend key for the map", () => {
  test("shows legend on the map with core items", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard-insights");

    const legend = page.getByTestId("legend-key");
    await expect(legend).toBeVisible();

    await expect(legend).toContainText("Legend");

    await expect(legend).toContainText("Selected Area");
    await expect(legend).toContainText("Unique Households Served");
  });
});
