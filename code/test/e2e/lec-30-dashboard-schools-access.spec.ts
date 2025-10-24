// LEC-30
// As a user, I want to be able to access the dashboard-schools route with a link/button
import { test, expect } from "@playwright/test";
test("test", async ({ page }) => {
  await page.goto("http://localhost:3000/dashboard-insights");
  await page.getByRole("link", { name: "Dashboard Insights" }).click();
  await page.getByRole("link", { name: "Dashboard Insights" }).click();
  await page.getByRole("link", { name: "Dashboard Insights" }).click();
});
