import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mismo alias que tsconfig.json, para que las pruebas importen igual que la app.
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/setup.ts"],
  },
});
