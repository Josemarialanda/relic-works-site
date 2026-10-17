import { defineConfig, devices } from "@playwright/test";

const PORT = 3123;

// Browser tests for the touch support. Each project runs only its own spec file.
// All projects use Chromium, because the swipe helper sends touch events through CDP.
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: "phone", testMatch: "phone.spec.ts", use: { ...devices["iPhone SE"], browserName: "chromium" } },
    { name: "tablet", testMatch: "tablet.spec.ts", use: { browserName: "chromium", viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true } },
    { name: "desktop", testMatch: "desktop.spec.ts", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
  // Test the production build, not the dev server.
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
