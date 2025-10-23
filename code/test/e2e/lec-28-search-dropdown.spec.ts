// LEC-28
// As a user, I want the ability to dynamically search counties/zip within the dropdowns

import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("http://localhost:3000/dashboard-insights");
  await page.getByRole("combobox", { name: "Select a county..." }).click();
  await page.getByRole("combobox", { name: "Select a county..." }).click();
  await page.locator("#headlessui-combobox-button-_R_aqml9bn5rlb_").click();
  await page.getByRole("combobox", { name: "Select a county..." }).fill("wi");
  await page.getByRole("option", { name: "WILCOX" }).click();
  await page.getByRole("combobox", { name: "Select a ZIP code" }).click();
  await page.locator("#headlessui-combobox-button-_R_ar6l9bn5rlb_").click();
  await page.getByRole("combobox", { name: "Select a ZIP code" }).fill("31");
  await page.getByRole("option", { name: "31071" }).click();
  await page.getByRole("region", { name: "Map" }).click();
});
