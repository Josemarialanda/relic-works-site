import { expect, type CDPSession, type Locator, type Page } from "@playwright/test";

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

// Force :hover and :active on the first element that matches the selector. Emulated touches in
// headless Chromium do not set these states, so a test of the touch styles must force them.
export async function forcePseudoState(page: Page, selector: string, states: ("hover" | "active")[]) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: states });
}

// The footer must be at the bottom of the window when the page is short, and at the end of the page when
// the page is long. Call it for the project of the spec file: it uses the viewport of that project.
export async function expectFooterAtBottom(page: Page) {
  const height = 2400; // taller than the empty bag and the confirmation page, in every layout
  await page.setViewportSize({ width: page.viewportSize()!.width, height });
  for (const path of ["/bag", "/checkout/success"]) {
    await page.goto("/bag");
    await page.evaluate(() => localStorage.setItem("relic-bag", "[]"));
    await page.goto(path);
    const footer = (await page.locator("footer").boundingBox())!;
    expect(Math.round(footer.y + footer.height), `${path}: the bottom of the footer`).toBe(height);
    expect(await page.evaluate(() => document.documentElement.scrollHeight), `${path}: no extra scroll`).toBe(height);
  }
  // The page for an address that does not exist has the same layout and the same footer position.
  const missing = await page.goto("/this-page-does-not-exist");
  expect(missing!.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found." })).toBeVisible();
  const footer404 = (await page.locator("footer").boundingBox())!;
  expect(Math.round(footer404.y + footer404.height), "404: the bottom of the footer").toBe(height);
  expect(await page.evaluate(() => document.documentElement.scrollHeight), "404: no extra scroll").toBe(height);

  // A long page: the footer is at the end of the page, with nothing below it.
  await page.goto("/shop");
  const end = await page.evaluate(() => {
    const f = document.querySelector("footer")!.getBoundingClientRect();
    return { footerBottom: Math.round(f.bottom + window.scrollY), pageHeight: document.documentElement.scrollHeight };
  });
  expect(end.footerBottom, "/shop: the footer is at the end of the page").toBe(end.pageHeight);
}
