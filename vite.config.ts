import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import commonjs from "vite-plugin-commonjs";

export default defineConfig({
  plugins: [tailwindcss(), commonjs(), reactRouter()],
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      requireReturnsDefault: "auto",
      ignoreDynamicRequires: true
    }
  },
  optimizeDeps: {
    include: [
      "@stoplight/json-schema-viewer",
      "@stoplight/markdown-viewer",
      "@stoplight/mosaic",
      "@stoplight/mosaic-code-viewer"
    ]
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
      lodash: "lodash-es"
    }
  }
});
