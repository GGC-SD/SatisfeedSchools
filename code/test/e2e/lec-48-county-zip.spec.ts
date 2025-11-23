// LEC-57
// As a user, I do not want the food distribution to be yellow

import { test, expect } from "@playwright/test";

test("Unique Households Served is not yellow", async ({ page }) => {
  await page.goto("http://localhost:3000/dashboard-insights");

  const swatch = page.getByTestId("legend-unique-households-swatch");
  await expect(swatch).toBeVisible();

  const color = await swatch.evaluate(
    (el) => window.getComputedStyle(el).backgroundColor
  );

  console.log("Unique Households Swatch Color:", color);

  expect(color).not.toBe("rgb(255, 255, 0)");
});
