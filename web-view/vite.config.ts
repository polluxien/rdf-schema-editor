import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ["@rmlio/yarrrml-parser/lib/rml-generator.js"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
