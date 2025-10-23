import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "test/e2e",
  use: {
    headless: false,
    baseURL: "http://localhost:3000",
  },
});
