import { expect, test, type Locator } from "@playwright/test";
import { heroDots, heroSlide, sizes, swipe, touchHold } from "./helpers";

const MIN_TARGET = 44;

async function expectTapTargets(locator: Locator) {
  const all = await sizes(locator);
  expect(all.length).toBeGreaterThan(0);
  for (const s of all) expect(s.height, `"${s.text}" height`).toBeGreaterThanOrEqual(MIN_TARGET);
}

test("the page matches the touch media query", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
});

test.describe("hero carousel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("a swipe left shows the next slide, a swipe right the previous slide", async ({ page }) => {
    const box = (await page.locator("section").first().boundingBox())!;
    const y = box.y + 100;
    const start = await heroSlide(page);

    await swipe(page, { x: box.x + 300, y }, { x: box.x + 60, y });
    await expect.poll(() => heroSlide(page)).toBe((start + 1) % 3);

    await swipe(page, { x: box.x + 60, y }, { x: box.x + 300, y });
    await expect.poll(() => heroSlide(page)).toBe(start);
  });

  test("the autoplay stops while a finger is on the slide", async ({ page }) => {
    const box = (await page.locator("section").first().boundingBox())!;
    const start = await heroSlide(page);
    const lift = await touchHold(page, { x: box.x + 150, y: box.y + 100 });
    // The autoplay interval is 5 s.
    await page.waitForTimeout(6000);
    expect(await heroSlide(page)).toBe(start);
    await lift();
  });

  test("a swipe that starts on a CTA does not open the link", async ({ page }) => {
    const cta = (await page.locator("section").first().locator("a").first().boundingBox())!;
    const x = cta.x + cta.width / 2;
    const y = cta.y + cta.height / 2;
    await swipe(page, { x: x + 80, y }, { x: x - 80, y });
    await page.waitForTimeout(500);
    await expect(page).toHaveURL("/");
  });

  test("a tap on a dot after a swipe still works", async ({ page }) => {
    const box = (await page.locator("section").first().boundingBox())!;
    const y = box.y + 100;
    await swipe(page, { x: box.x + 300, y }, { x: box.x + 60, y });
    await heroDots(page).nth(2).tap();
    await expect.poll(() => heroSlide(page)).toBe(2);
  });

  test("the dots stay 10px, with a larger tap area", async ({ page }) => {
    for (const s of await sizes(heroDots(page))) expect(s.width).toBe(10);
    // A point 20px to the right of the first dot centre still hits a button.
    // elementFromPoint finds only points in the viewport, so scroll to the dots first.
    const dot = heroDots(page).first();
    await dot.scrollIntoViewIfNeeded();
    const hit = await dot.evaluate((dot) => {
      const r = dot.getBoundingClientRect();
      return document.elementFromPoint(r.x + r.width / 2 + 20, r.y + r.height / 2)?.tagName;
    });
    expect(hit).toBe("BUTTON");
  });
});

test.describe("hero layout", () => {
  type Box = { x: number; y: number; width: number; height: number };
  const overlaps = (a: Box, b: Box) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

  // From a small phone to the widest phone layout.
  for (const width of [320, 375, 393, 430, 767]) {
    test(`at ${width}px, the dots and their tap areas do not cover the poster or the CTAs`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const hero = page.locator("section").first();
      const poster = (await hero.locator(".poster").boundingBox())!;
      const ctas = await Promise.all((await hero.locator("a").all()).map(async (a) => (await a.boundingBox())!));
      for (const dot of await heroDots(page).all()) {
        const d = (await dot.boundingBox())!;
        // The ::after of each dot gives a 44px tap area around the 10px dot.
        const tap = { x: d.x - 17, y: d.y - 17, width: d.width + 34, height: d.height + 34 };
        expect(overlaps(d, poster), "dot over the poster").toBe(false);
        expect(overlaps(tap, poster), "dot tap area over the poster").toBe(false);
        for (const cta of ctas) expect(overlaps(tap, cta), "dot tap area over a CTA").toBe(false);
      }
    });
  }
});

test.describe("tap targets", () => {
  test("nav links", async ({ page }) => {
    await page.goto("/");
    await expectTapTargets(page.locator("header a"));
  });

  test("footer links", async ({ page }) => {
    await page.goto("/");
    await expectTapTargets(page.locator("footer a"));
  });

  test("bespoke chips, swatches and tabs", async ({ page }) => {
    await page.goto("/bespoke");
    await expectTapTargets(page.locator("main button, button[aria-pressed]"));
  });

  test("bag quantity buttons", async ({ page }) => {
    await page.goto("/shop");
    await page.getByRole("button", { name: "Add to bag" }).first().tap();
    await page.goto("/bag");
    const qty = await sizes(page.locator("button[aria-label^='Add one'], button[aria-label^='Remove one']"));
    expect(qty.length).toBeGreaterThan(0);
    for (const s of qty) {
      expect(s.width).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(s.height).toBeGreaterThanOrEqual(MIN_TARGET);
    }
  });
});

test.describe("shop filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/shop");
  });

  test("the filters are closed at first and the toggle opens them", async ({ page }) => {
    const toggle = page.locator("button[aria-controls=shop-filters]");
    const filters = page.locator("#shop-filters");
    await expect(toggle).toBeVisible();
    await expect(filters).toBeHidden();

    await toggle.tap();
    await expect(filters).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    await toggle.tap();
    await expect(filters).toBeHidden();
  });

  test("the toggle shows the number of selected filters", async ({ page }) => {
    const toggle = page.locator("button[aria-controls=shop-filters]");
    await expect(toggle).toContainText("Filters (0)");
    await toggle.tap();
    await page.locator("#shop-filters button[aria-pressed]").first().tap();
    await expect(toggle).toContainText("Filters (1)");
  });

  test("filter options, sort buttons and add-to-bag buttons are large enough", async ({ page }) => {
    await page.locator("button[aria-controls=shop-filters]").tap();
    await expectTapTargets(page.locator("#shop-filters button[aria-pressed]"));
    await expectTapTargets(page.locator("main button[aria-pressed]"));
    await expectTapTargets(page.getByRole("button", { name: "Add to bag" }));
  });

  test("the page does not scroll sideways", async ({ page }) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
});

test.describe("collage lightbox", () => {
  test("it locks the page scroll and a swipe down closes it", async ({ page }) => {
    await page.goto("/workshop");
    await page.locator("button[title^='View']").first().tap();
    const close = page.getByRole("button", { name: "Close" });
    await expect(close).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");

    const box = (await close.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(box.height).toBeGreaterThanOrEqual(MIN_TARGET);

    await swipe(page, { x: 180, y: 200 }, { x: 180, y: 450 });
    await expect(close).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
  });
});
