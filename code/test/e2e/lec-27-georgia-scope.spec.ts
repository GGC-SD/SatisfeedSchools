// LEC-27
// As a user, I want to only see data within the scope of Georgia.

import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("http://localhost:3000/dashboard-insights");
  await page.getByRole("region", { name: "Map" }).click({
    position: {
      x: 96,
      y: 194,
    },
  });
  await page.getByRole("region", { name: "Map" }).click({
    position: {
      x: 175,
      y: 125,
    },
  });
  await page.getByRole("region", { name: "Map" }).click({
    position: {
      x: 522,
      y: 51,
    },
  });
  await page.getByRole("region", { name: "Map" }).click({
    position: {
      x: 132,
      y: 172,
    },
  });
  await page.getByRole("region", { name: "Map" }).click({
    position: {
      x: 378,
      y: 107,
    },
  });
  await page.getByRole("region", { name: "Map" }).click({
    position: {
      x: 385,
      y: 87,
    },
  });
  await page.getByRole("region", { name: "Map" }).click();
  await page.locator("html").click();
});
