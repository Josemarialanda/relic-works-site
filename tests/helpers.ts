import type { CDPSession, Locator, Page } from "@playwright/test";

type Point = { x: number; y: number };

// Playwright has a tap but no swipe, so send the touch events through CDP (Chromium only).
// The moves are one frame apart, and the finger stops before it lifts. Without this, Chromium
// sees a very fast flick, starts a fling, and then drops the next tap, because that tap stops the fling.
export async function swipe(page: Page, from: Point, to: Point, steps = 8) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(100);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

// Put a finger down and keep it there. Call the returned function to lift it.
export async function touchHold(page: Page, at: Point): Promise<() => Promise<void>> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at] });
  return async () => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
}

// The visible size of each element, in px.
export async function sizes(locator: Locator) {
  return locator.evaluateAll((els) =>
    els
      .filter((e) => (e as HTMLElement).offsetParent)
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { width: Math.round(r.width), height: Math.round(r.height), text: e.textContent?.trim() ?? "" };
      }),
  );
}

// The hero is the first section on the home page. Its dots are the buttons with a title.
export const heroDots = (page: Page) => page.locator("section").first().locator("button[title]");

// The index of the hero dot that shows the current slide.
export async function heroSlide(page: Page) {
  return heroDots(page).evaluateAll((els) => els.findIndex((e) => e.className.includes("on")));
}
