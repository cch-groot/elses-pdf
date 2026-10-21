import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
  // keeps the package usable from Next.js App Router components
  banner: { js: '"use client";' },
});
