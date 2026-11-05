import { defineConfig } from "vite";

// Relative base so the build also works from a sub-path (GitHub Pages).
export default defineConfig({ base: "./", build: { target: "es2022" } });
