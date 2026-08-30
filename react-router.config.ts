import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";
import { listAllPrerenderPaths } from "./scripts/public-prerender-paths";

export default {
  ssr: true,
  prerender: {
    paths: () => listAllPrerenderPaths(),
    concurrency: 8
  },
  routeDiscovery: { mode: "initial" },
  presets: [vercelPreset()]
} satisfies Config;
