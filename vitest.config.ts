import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

/**
 * Merged rather than re-declared, so the plugin list has exactly one source.
 * Declaring `react()` separately here also produces a Vite plugin-type clash
 * between the two entry points.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      include: ["test/**/*.test.{ts,tsx}"],
      setupFiles: ["./test/setup.ts"],
      /*
       * The app refuses to run without both of these — see `configured()` —
       * so a suite without them tests the "not configured" screen and nothing
       * else. Set here rather than in a .env.test so the values are visible
       * beside the tests that depend on them.
       */
      env: {
        VITE_HATCH_URL: "https://hatch.test",
        VITE_HATCH_STAFF_TOKEN: "t".repeat(32),
      },
    },
  }),
);
