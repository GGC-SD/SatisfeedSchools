import { test, expect } from "@playwright/test";

test("User can click a library on the map", async ({ page }) => {
  await page.goto("http://localhost:3000/dashboard-insights");

  await page.getByRole("button", { name: "Libraries" }).click();

  await page.waitForFunction(() => {
    const canvas = document.querySelector(
      "canvas.maplibregl-canvas"
    ) as HTMLCanvasElement | null;
    return canvas?.getAttribute("data-has-libraries") === "true";
  });

  const canvas = page.locator("canvas.maplibregl-canvas").first();
  await canvas.click({ position: { x: 465, y: 88 } });

  const selectedName = await canvas.getAttribute("data-selected-library-name");

  console.log("Selected library name:", selectedName);

  expect(selectedName).not.toBeNull();
  expect(String(selectedName)).not.toHaveLength(0);

  await expect(page.getByText("+1 770-978-5154")).toBeVisible();
});
