import { defineConfig } from "vitest/config";
import { resolve } from "path";

import pkg from "./package.json";

export default defineConfig({
  build: {
    target: "esnext",
    minify: "terser",
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "Reroutes",
      formats: ["es", "umd", "iife"],
    },
    rollupOptions: {
      external: Object.keys(pkg.peerDependencies)
        .concat(Object.keys(pkg.dependencies))
        .concat("redux-saga/effects"),
    },
  },
  test: {
    environment: "jsdom",
    coverage: {
      enabled: true,
      reporter: ["lcovonly", "text"],
      reportsDirectory: "coverage",
    },
  },
});
