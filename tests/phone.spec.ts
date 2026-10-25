import { expect, test, type Locator } from "@playwright/test";
import { forcePseudoState, heroDots, heroSlide, sizes, swipe, touchHold } from "./helpers";

const MIN_TARGET = 44;

async function expectTapTargets(locator: Locator) {
  const all = await sizes(locator);
  expect(all.length).toBeGreaterThan(0);
  for (const s of all) expect(s.height, `"${s.text}" height`).toBeGreaterThanOrEqual(MIN_TARGET);
}

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
      const poster = (await hero.locator("img[alt='Relic Works']").boundingBox())!;
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

  test("bespoke chips and tabs", async ({ page }) => {
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

  test("the toolbar has the same space above the product count as below the sort buttons", async ({ page }) => {
    const space = await page.locator("main > div").first().evaluate((toolbar) => {
      // Measure the text, not the elements, because the space can come from the element height.
      const textBox = (el: Element) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getBoundingClientRect();
      };
      const box = toolbar.getBoundingClientRect();
      const count = textBox(toolbar.querySelector("span")!);
      const sort = textBox(toolbar.querySelector("button[aria-pressed]")!);
      return { above: Math.round(count.top - box.top), below: Math.round(box.bottom - sort.bottom) };
    });
    expect(space.above).toBeGreaterThanOrEqual(12);
    expect(Math.abs(space.above - space.below), JSON.stringify(space)).toBeLessThanOrEqual(4);
  });

  test("the page does not scroll sideways", async ({ page }) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
});

test.describe("filled buttons and footer links on touch", () => {
  const WHITE = "rgb(255, 255, 255)";

  // The page has the touch media (pointer: coarse, hover: none). The test forces the states,
  // because emulated touches do not set them. A real touch browser sets both: :active while the
  // finger is down, and a "sticky" :hover after the tap.
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("the hero CTA keeps white text on a black background when pressed", async ({ page }) => {
    await forcePseudoState(page, "section a", ["hover", "active"]);
    const cta = page.locator("section a").first();
    await expect(cta).toHaveCSS("color", WHITE);
    await expect(cta).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(cta).toHaveCSS("opacity", "1");
  });

  test("the hero CTA keeps white text with the hover state after a tap", async ({ page }) => {
    await forcePseudoState(page, "section a", ["hover"]);
    await expect(page.locator("section a").first()).toHaveCSS("color", WHITE);
  });

  test("the outline CTA keeps black text when pressed", async ({ page }) => {
    await forcePseudoState(page, "section a + a", ["hover", "active"]);
    await expect(page.locator("section a + a").first()).toHaveCSS("color", "rgb(0, 0, 0)");
  });

  test("a footer link keeps its colour after a tap", async ({ page }) => {
    const link = page.locator("footer a").first();
    const before = await link.evaluate((e) => getComputedStyle(e).color);
    await forcePseudoState(page, "footer a", ["hover"]);
    await expect(link).toHaveCSS("color", before);
  });
});

test.describe("stem calculator", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/bespoke");
    await page.getByRole("button", { name: "Stem calculator" }).tap();
  });

  test("it fills the screen, with no sideways scroll", async ({ page }) => {
    const dialog = page.getByRole("dialog", { name: "Stem calculator" });
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box).toMatchObject({ x: 0, y: 0, width: viewport.width, height: viewport.height });
    expect(await dialog.evaluate((d) => d.scrollWidth > d.clientWidth)).toBe(false);
  });

  test("the drawing and the result stay in view when the sliders scroll", async ({ page }) => {
    const dialog = page.getByRole("dialog", { name: "Stem calculator" });
    await dialog.evaluate((d) => d.scrollTo(0, d.scrollHeight));
    const drawing = (await dialog.getByRole("img").boundingBox())!;
    expect(drawing.y).toBeGreaterThanOrEqual(0);
    expect(drawing.y + drawing.height).toBeLessThan(page.viewportSize()!.height);
    await expect(dialog.getByText(/than stem 2/)).toBeInViewport();
  });

  test("the sliders and the close button are large enough to tap", async ({ page }) => {
    const dialog = page.getByRole("dialog", { name: "Stem calculator" });
    await expectTapTargets(dialog.locator("input[type=range]"));
    const close = (await dialog.getByRole("button", { name: "Close" }).boundingBox())!;
    expect(close.width).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(close.height).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  test("the page behind does not scroll while it is open", async ({ page }) => {
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).tap();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
  });
});

test("the 3D view of the bespoke page stays under the header while the options scroll", async ({ page }) => {
  await page.goto("/bespoke");
  const view = page.locator("#configure > div").first();
  await page.getByRole("button", { name: "Add to bag" }).scrollIntoViewIfNeeded();
  const header = (await page.locator("header").boundingBox())!;
  const box = (await view.boundingBox())!;
  expect(header.y).toBe(0);
  expect(Math.abs(box.y - (header.y + header.height))).toBeLessThanOrEqual(1);
  expect(box.height).toBeGreaterThan(200);
  // The options scroll under it, not over it.
  expect(await view.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
});

test("the header stays at the top of the window when the page scrolls", async ({ page }) => {
  await page.goto("/bespoke");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator("header")).toBeInViewport();
  expect((await page.locator("header").boundingBox())!.y).toBe(0);
});

test("a link to a support section scrolls it to just under the header", async ({ page }) => {
  await page.goto("/support");
  await page.locator("footer").getByRole("link", { name: "Shipping & returns" }).click();
  const header = (await page.locator("header").boundingBox())!;
  await expect.poll(async () => Math.abs((await page.locator("#shipping").boundingBox())!.y - header.height)).toBeLessThanOrEqual(2);
});

test("the bespoke page does not scroll sideways", async ({ page }) => {
  await page.goto("/bespoke");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
