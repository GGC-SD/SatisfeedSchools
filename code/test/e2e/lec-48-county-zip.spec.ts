// LEC-48
// As a user, when I filter by County / ZIP code I expect the map to move to that location

import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("http://localhost:3000/dashboard-insights");
  await page.locator("#headlessui-combobox-button-_R_aqml9bn5rlb_").click();
  await page.getByRole("option", { name: "APPLING" }).click();
  await page.locator("#headlessui-combobox-button-_R_aqml9bn5rlb_").click();
  await page.getByRole("option", { name: "BARROW" }).click();
  await page.getByRole("combobox", { name: "Select a county..." }).dblclick();
  await page.getByRole("combobox", { name: "Select a county..." }).fill("Gw");
  await page
    .getByRole("combobox", { name: "Select a county..." })
    .press("Enter");
  await page.getByRole("combobox", { name: "Select a ZIP code" }).click();
  await page.locator("#headlessui-combobox-button-_R_aqml9bn5rlb_").click();
  await page.getByRole("combobox", { name: "Select a county..." }).fill("Gw");
  await page
    .getByRole("combobox", { name: "Select a county..." })
    .press("Enter");
  await page.getByRole("combobox", { name: "Select a ZIP code" }).click();
  await page.getByRole("combobox", { name: "Select a ZIP code" }).fill("30019");
  await page
    .getByRole("combobox", { name: "Select a ZIP code" })
    .press("Enter");
});
