// Automated tests (pnpm test). Two projects:
//  - unit: pure logic, no database or network
//  - db:   logic that talks to MongoDB, against an in-memory server the
//          tests start themselves (tests/db/globalSetup.ts); never the
//          database in .env.local
// Secrets below are fixed test values, not real ones.
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    env: {
      ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      JWT_SECRET: "test-jwt-secret-at-least-32-characters-long",
      HASH_SALT: "test-hash-salt",
      NEXT_PUBLIC_APP_URL: "https://uniarchive.test",
      MONGODB_URI: "",
      BREVO_API_KEY: "",
      BREVO_API_URL: "",
    },
    projects: [
      { extends: true, test: { name: "unit", include: ["tests/unit/**/*.test.ts"] } },
      {
        extends: true,
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          globalSetup: ["tests/db/globalSetup.ts"],
          setupFiles: ["tests/db/setup.ts"],
          hookTimeout: 120_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
