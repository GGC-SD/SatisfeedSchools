// // LEC-6
// // As a user, I need to be able to filter data in proximity to landmarks to view hotspots of customer locations

// // For this file, uncomment and then run: npx playwright test --headed --debug and step over

// import { test, expect } from "@playwright/test";

// test.setTimeout(60_000);

// test("select a couple of schools from the map and clear", async ({ page }) => {
//   await page.goto("http://localhost:3000/dashboard-insights", {
//     waitUntil: "domcontentloaded",
//   });

//   // Wait for the map canvas to exist and be visible
//   const map = page.getByRole("region", { name: "Map" });
//   await expect(map).toBeVisible();
//   await expect(page.locator("canvas")).toBeVisible();

//   // (Optional tiny buffer if your layers render just after canvas)
//   await page.waitForTimeout(300);

//   // --- First selection via map clicks (kept from your script) ---
//   await map.click({ position: { x: 351, y: 80 } });
//   await map.click({ position: { x: 289, y: 102 } });

//   // Wait for the selection UI to show (robust text, not a giant exact string)
//   const householdsLine = page.getByText(/Households:\s*\d+/, { exact: false });
//   await expect(householdsLine).toBeVisible();

//   // --- Change selection with another map click ---
//   await map.click({ position: { x: 411, y: 427 } });

//   // Assert a heading for the selected school appears (don’t hardcode the name)
//   await expect(page.getByRole("heading")).toBeVisible();

//   // Re-assert households line still present
//   await expect(householdsLine).toBeVisible();

//   // Clear selection: wait for the button to appear, click, then verify it’s gone
//   const clearBtn = page.getByRole("button", { name: /clear selected school/i });
//   await expect(clearBtn).toBeVisible();
//   await clearBtn.click();
//   await expect(clearBtn).toHaveCount(0);
// });
