import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"], // <-- this line is critical
    css: true,
    globals: true,
  },
});
