import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // rooms.ts imports config.ts which validates AUTH_SECRET at module load.
    env: {
      AUTH_SECRET: "test-secret",
      DATABASE_URL: "",
    },
  },
});
