import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import bespokeJson from "../data/bespoke.json";
import { PART_IDS, parseBespokeData } from "../data/bespoke";
import productsJson from "./fixtures/products.json";
import shippingJson from "../data/shipping.json";
import { parseZones } from "../data/shipping";
import { buildOrder } from "../lib/checkout";
import { parseStripeProducts } from "../lib/catalog-stripe";
import type Stripe from "stripe";
import { expectFooterAtBottom, heroDots, heroSlide, sizes } from "./helpers";

// Fake Stripe products made from tests/fixtures/products.json. The tests of the catalog code use them, so these
// tests need no network. The tests that open the site use the real Stripe products of the account in STRIPE_SECRET_KEY.
const fakeStripeProducts = (data: typeof productsJson) =>
  data.products.map((p, i) => ({
    id: `prod_${i}`,
    name: p.name,
    active: true,
    images: [`https://files.stripe.com/links/${i}`],
    metadata: { category: p.category, material: p.material, finish: p.finish, order: String(i + 1) },
    default_price: { id: `price_${i}`, currency: "gbp", type: "one_time", unit_amount: Math.round(p.price * 100) },
  })) as unknown as Stripe.Product[];
const CATALOG = parseStripeProducts(fakeStripeProducts(productsJson));
const order = (payload: unknown) => buildOrder(payload, CATALOG.products);

// With a mouse, the touch changes must not change the site.

test("the page does not match the touch media query", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(false);
});

test("the hero dots are 10px with a 12px gap", async ({ page }) => {
  await page.goto("/");
  for (const s of await sizes(heroDots(page))) expect(s.width).toBe(10);
  const gap = await heroDots(page)
    .first()
    .evaluate((dot) => getComputedStyle(dot.parentElement!).columnGap);
  expect(gap).toBe("12px");
});

test("the nav links keep their size", async ({ page }) => {
  await page.goto("/");
  for (const s of await sizes(page.locator("header nav a"))) expect(s.height).toBeLessThan(44);
});

test("a hover underlines a nav link", async ({ page }) => {
  await page.goto("/");
  const link = page.locator("header nav a").nth(1);
  await link.hover();
  await expect(link).toHaveCSS("text-decoration-line", "underline");
});

test("a mouse drag on the hero does not change the slide", async ({ page }) => {
  await page.goto("/");
  const box = (await page.locator("section").first().boundingBox())!;
  const start = await heroSlide(page);
  await page.mouse.move(box.x + 300, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 50, box.y + 100, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  expect(await heroSlide(page)).toBe(start);
});

test.describe("shop filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/shop");
  });

  test("the filters show, with no toggle", async ({ page }) => {
    await expect(page.locator("button[aria-controls=shop-filters]")).toBeHidden();
    await expect(page.locator("#shop-filters")).toBeVisible();
  });

  test("the filters stay at the top when the page scrolls", async ({ page }) => {
    await page.mouse.wheel(0, 1500);
    await expect
      .poll(() => page.locator("#shop-filters").evaluate((e) => Math.round(e.getBoundingClientRect().top)))
      .toBe(0);
  });
});

test.describe("filled buttons and footer links", () => {
  const WHITE = "rgb(255, 255, 255)";

  test("the hero CTA keeps white text on a black background on hover and while pressed", async ({ page }) => {
    await page.goto("/");
    const cta = page.locator("section").first().locator("a").first();
    await expect(cta).toHaveCSS("color", WHITE);

    await cta.hover();
    await expect(cta).toHaveCSS("color", WHITE);
    await expect(cta).toHaveCSS("background-color", "rgb(0, 0, 0)");

    // The design system has no colour change, so a press must not make the button gray.
    await page.mouse.down();
    await expect(cta).toHaveCSS("color", WHITE);
    await expect(cta).toHaveCSS("opacity", "1");
    await page.mouse.up();
  });

  test("the outline CTA keeps black text on hover", async ({ page }) => {
    await page.goto("/");
    const cta = page.locator("section").first().locator("a").nth(1);
    await cta.hover();
    await expect(cta).toHaveCSS("color", "rgb(0, 0, 0)");
  });

  test("a footer link keeps its colour on hover", async ({ page }) => {
    await page.goto("/");
    const link = page.locator("footer a").first();
    const before = await link.evaluate((e) => getComputedStyle(e).color);
    await link.hover();
    await expect(link).toHaveCSS("color", before);
  });

  test("a shop button keeps white text on hover", async ({ page }) => {
    await page.goto("/shop");
    const add = page.getByRole("button", { name: "Add to bag" }).first();
    await add.hover();
    await expect(add).toHaveCSS("color", WHITE);
  });
});

test.describe("stem calculator", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/bespoke");
    await page.getByRole("button", { name: "Stem calculator" }).click();
  });

  const dialog = (page: import("@playwright/test").Page) => page.getByRole("dialog", { name: "Stem calculator" });
  const slider = (page: import("@playwright/test").Page, group: string, label: string) =>
    dialog(page).getByRole("group", { name: group }).getByLabel(label);

  test("it opens in front of the page with the reference defaults", async ({ page }) => {
    await expect(dialog(page)).toBeVisible();
    // The same values and result as the MyVeloFit stem calculator.
    await expect(dialog(page)).toContainText("Stem 1 is 19.2mm lower and 16.3mm longer than stem 2.");
  });

  test("the result follows the sliders", async ({ page }) => {
    // 10 mm more spacers at a 73° head angle: 10 × sin 73° = 9.6 mm higher, 10 × cos 73° = 2.9 mm less reach.
    await slider(page, "Stem 1", "Headset spacers").fill("30");
    await expect(dialog(page)).toContainText("Stem 1 is 9.7mm lower and 13.3mm longer than stem 2.");
    await expect(dialog(page).getByRole("group", { name: "Stem 1" }).locator("output").last()).toHaveText("30 mm");
  });

  test("two equal stems give the same position", async ({ page }) => {
    await slider(page, "Stem 2", "Stem length").fill("100");
    await slider(page, "Stem 2", "Stem angle").fill("-7");
    await expect(dialog(page)).toContainText("The two stems put the handlebar in the same position.");
  });

  test("Escape, the close button and a click on the backdrop close it", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();

    await page.getByRole("button", { name: "Stem calculator" }).click();
    await dialog(page).getByRole("button", { name: "Close" }).click();
    await expect(dialog(page)).toBeHidden();

    await page.getByRole("button", { name: "Stem calculator" }).click();
    await page.mouse.click(5, 5);
    await expect(dialog(page)).toBeHidden();
  });

  test("a click inside the dialog does not close it", async ({ page }) => {
    await dialog(page).getByText("Compare two stems").click();
    await expect(dialog(page)).toBeVisible();
  });

  test("it keeps the slider values after it closes and opens again", async ({ page }) => {
    await slider(page, "Stem 2", "Stem length").fill("120");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Stem calculator" }).click();
    await expect(slider(page, "Stem 2", "Stem length")).toHaveValue("120");
  });

  test("the button shows only for stems", async ({ page }) => {
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Spacers" }).click();
    await expect(page.getByRole("button", { name: "Stem calculator" })).toHaveCount(0);
  });
});

test("the stem drawing stays inside its box at the extreme slider values", async ({ page }) => {
  await page.goto("/bespoke");
  await page.getByRole("button", { name: "Stem calculator" }).click();
  const dialog = page.getByRole("dialog", { name: "Stem calculator" });
  const set = (group: string | null, label: string, value: number) =>
    (group ? dialog.getByRole("group", { name: group }) : dialog).getByLabel(label).first().fill(String(value));

  for (const head of [65, 80])
    for (const angle of [-40, 40])
      for (const spacers of [0, 50])
        for (const length of [40, 150]) {
          await set(null, "Headtube angle", head);
          await set("Stem 1", "Stem angle", angle);
          await set("Stem 1", "Headset spacers", spacers);
          await set("Stem 1", "Stem length", length);
          const fits = await dialog.getByRole("img").evaluate((svg) => {
            const s = svg as SVGSVGElement;
            const v = s.viewBox.baseVal;
            const b = s.getBBox();
            // getBBox has no line width, so allow for half of the 8-unit spacer line.
            return b.x - 4 >= v.x && b.y - 4 >= v.y && b.x + b.width + 4 <= v.x + v.width && b.y + b.height + 4 <= v.y + v.height;
          });
          expect(fits, `head ${head}°, angle ${angle}°, spacers ${spacers} mm, length ${length} mm`).toBe(true);
        }
});

test.describe("stem calculator size", () => {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1024, height: 700 },
  ]) {
    test(`at ${viewport.width}×${viewport.height}, the dialog does not change size or position when a slider moves`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/bespoke");
      await page.getByRole("button", { name: "Stem calculator" }).click();
      const dialog = page.getByRole("dialog", { name: "Stem calculator" });
      const start = await dialog.boundingBox();

      const sliders = dialog.locator("input[type=range]");
      for (let i = 0; i < (await sliders.count()); i++) {
        const s = sliders.nth(i);
        const [min, max] = await s.evaluate((e) => [Number((e as HTMLInputElement).min), Number((e as HTMLInputElement).max)]);
        for (const v of [min, max, Math.round((min + max) / 2)]) {
          await s.fill(String(v));
          expect(await dialog.boundingBox(), `slider ${i} at ${v}`).toEqual(start);
        }
      }
    });
  }
});

test("the stem calculator keeps its height when the result needs more lines", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.goto("/bespoke");
  await page.getByRole("button", { name: "Stem calculator" }).click();
  const dialog = page.getByRole("dialog", { name: "Stem calculator" });
  const g = (name: string) => dialog.getByRole("group", { name });
  const set = async (blue: number[], red: number[]) => {
    for (const [name, values] of [["Stem 1", blue], ["Stem 2", red]] as const) {
      await g(name).getByLabel("Stem length").fill(String(values[0]));
      await g(name).getByLabel("Stem angle").fill(String(values[1]));
      await g(name).getByLabel("Headset spacers").fill(String(values[2]));
    }
  };
  const style = await page.addStyleTag({ content: "/* set in the loop */" });

  // Safari measures text in a different way, so there the left column (drawing and result) can be
  // the taller one, and its height then follows the number of lines in the result. Larger result
  // text gives the same condition here. The sizes cover the cases where the line count changes.
  for (let size = 20; size <= 48; size += 2) {
    await style.evaluate((el, size) => (el.textContent = `[aria-live] { font-size: ${size}px !important; }`), size);
    // Two equal stems give the shortest result.
    await set([100, -7, 20], [100, -7, 20]);
    const short = (await dialog.boundingBox())!.height;
    // Below the maximum height (the window height minus 40px), or the test cannot find a change.
    expect(short).toBeLessThan(1200 - 40);
    // The longest result.
    await set([150, 40, 50], [40, -40, 0]);
    expect((await dialog.boundingBox())!.height, `result text at ${size}px`).toBe(short);
  }
});

test.describe("images", () => {
  for (const path of ["/", "/shop", "/bespoke", "/bag", "/workshop"]) {
    test(`all images on ${path} load`, async ({ page }) => {
      // The bag is empty on a first visit, so the bag page needs items to show their images.
      if (path === "/bag") await saveBag(page, DEMO_BAG);
      await page.goto(path);
      const imgs = page.locator("main img, section img");
      expect(await imgs.count()).toBeGreaterThan(0);
      // Lazy images load only near the view, so scroll each one into view first.
      for (const img of await imgs.all()) {
        await img.scrollIntoViewIfNeeded();
        await expect(img).toHaveJSProperty("complete", true);
        expect(await img.evaluate((e: HTMLImageElement) => e.naturalWidth), (await img.getAttribute("src")) ?? "img").toBeGreaterThan(0);
      }
    });
  }

  test("the home and workshop pages use their own copy of the collage images", async ({ page }) => {
    for (const [path, folder] of [["/", "/images/home/"], ["/workshop", "/images/workshop/"]]) {
      await page.goto(path);
      const srcs = await page.locator("button[title^='View'] img").evaluateAll((els) => els.map((e) => e.getAttribute("src")));
      expect(srcs.length).toBe(6);
      for (const src of srcs) expect(decodeURIComponent(src!)).toContain(`${folder}collage-`);
    }
  });

  test("the lightbox shows the photo of the tile", async ({ page }) => {
    await page.goto("/workshop");
    await page.locator("button[title='View Flat Cap']").click();
    await expect(page.locator("img[src*='workshop%2Fcollage-flat-cap.jpg']")).toHaveCount(2);
  });
});

test("a shop image is hidden behind a pixel pattern while it loads, then it shows", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/_next/image**", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/shop");
  const img = page.locator("main img").first();
  await expect(img).toHaveCSS("opacity", "0");
  release();
  // The blocks sharpen for about 0.4 s. Then the canvas is gone and the photo shows.
  await expect(img).toHaveCSS("opacity", "1");
  await expect(page.locator("main canvas")).toHaveCount(0);
});

test.describe("pixelated image on a 2x screen", () => {
  // On a 2x screen (a retina Mac) the browser reports naturalWidth in CSS pixels. The blocks once showed only the
  // top-left part of the photo, enlarged. The canvas must show the same photo as the image.
  test.use({ deviceScaleFactor: 2 });

  test("the pixel blocks show the whole photo, not a corner", async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/_next/image**", async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto("/shop");
    const card = page.locator("main img").first().locator("xpath=..");
    await expect(card.locator("img")).toHaveCSS("opacity", "0");
    release();
    // Compare the mean brightness of the four quarters of the canvas with the same quarters of the photo.
    const diff = await card.evaluate(
      (box) =>
        new Promise<number>((resolve, reject) => {
          const img = box.querySelector("img")!;
          const started = performance.now();
          const tick = () => {
            const canvas = box.querySelector("canvas");
            if (!canvas) return performance.now() - started > 8000 ? reject(new Error("no canvas")) : requestAnimationFrame(tick);
            const quarters = (source: CanvasImageSource, sx: number, sy: number, sw: number, sh: number) => {
              const c = document.createElement("canvas");
              c.width = c.height = 2;
              const ctx = c.getContext("2d")!;
              ctx.drawImage(source, sx, sy, sw, sh, 0, 0, 2, 2);
              const d = ctx.getImageData(0, 0, 2, 2).data;
              return [0, 4, 8, 12].map((i) => (d[i] + d[i + 1] + d[i + 2]) / 3);
            };
            // The photo is cropped to the box like object-fit: cover, so take the middle part of it with the box shape.
            const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
            const photo = document.createElement("canvas");
            photo.width = canvas.width;
            photo.height = canvas.height;
            photo.getContext("2d")!.drawImage(img, (canvas.width - img.naturalWidth * scale) / 2, (canvas.height - img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
            const a = quarters(canvas, 0, 0, canvas.width, canvas.height);
            const b = quarters(photo, 0, 0, photo.width, photo.height);
            resolve(Math.max(...a.map((v, i) => Math.abs(v - b[i]))));
          };
          requestAnimationFrame(tick);
        }),
    );
    expect(diff).toBeLessThan(30);
  });
});

test.describe("product range", () => {
  const PRODUCTS = ["Quill Stem", "Threadless Stem", `1" Spacer`, `1 1/8" Spacer`, "Flat Cap", "Spacer Cap"];

  test("the shop sells only the six products, two in each category", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByText("6 products", { exact: true })).toBeVisible();
    for (const name of PRODUCTS) await expect(page.getByText(name, { exact: true })).toHaveCount(1);
  });

  test("the home page prices come from the catalog", async ({ page }) => {
    await page.goto("/");
    for (const [cat, price] of [["Stems", "£185"], ["Spacers", "£24"], ["Caps", "£32"]])
      await expect(page.locator("main a", { has: page.getByText(cat, { exact: true }) })).toContainText(`From ${price}`);
  });

  test("a bag saved with a product that the shop no longer sells drops that product", async ({ page }) => {
    await page.goto("/bag");
    await page.evaluate(() =>
      localStorage.setItem(
        "relic-bag",
        JSON.stringify([
          { key: "Relic Quill|Steel · Raw", type: "Stems", name: "Relic Quill", spec: "Steel · Raw", price: 210, qty: 1, image: null },
          { key: "Flat Cap|Aluminium · Painted", type: "Caps", name: "Flat Cap", spec: "Aluminium · Painted", price: 32, qty: 1, image: null },
        ]),
      ),
    );
    await page.reload();
    // An item with no image shows its name twice: on the placeholder tile and as the item name.
    await expect(page.getByText("Flat Cap", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("Relic Quill")).toHaveCount(0);
  });

  test("the bespoke page offers the product types of each part", async ({ page }) => {
    await page.goto("/bespoke");
    const chip = (name: string) => page.getByRole("button", { name, exact: true });
    for (const name of ["Quill", "Threadless"]) await expect(chip(name)).toBeVisible();

    await page.getByRole("button", { name: "Spacers", exact: true }).click();
    for (const name of [`1"`, `1 1/8"`]) await expect(chip(name)).toBeVisible();

    await page.getByRole("button", { name: "Caps", exact: true }).click();
    await expect(chip("Flat cap")).toHaveAttribute("aria-pressed", "true");
    // A flat cap has no integrated spacer.
    await expect(page.getByText("Integrated spacer height")).toHaveCount(0);
    await chip("Spacer cap").click();
    await expect(page.getByText("Integrated spacer height")).toBeVisible();
  });
});

test("the hero buttons have the same width as each other on every slide", async ({ page }) => {
  for (const width of [320, 430, 600, 820, 1280, 1680]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const hero = page.locator("section").first();
    const ctas = hero.locator(`a[class*="button"]`);
    const widths = new Set<number>();
    for (const [i, name] of ["Shop stems", "Shop spacers", "Shop caps"].entries()) {
      await hero.locator("button[title]").nth(i).click();
      // Only the label of the current slide is in the accessible name.
      await expect(hero.getByRole("link", { name, exact: true })).toBeVisible();
      for (const box of await Promise.all((await ctas.all()).map((a) => a.boundingBox()))) widths.add(Math.round(box!.width));
    }
    expect([...widths], `at ${width}px`).toHaveLength(1);
  }
});

test("the two buttons at the end of the workshop page have the same width", async ({ page }) => {
  for (const width of [320, 393, 600, 767, 820, 1023, 1280, 1680]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/workshop");
    const [a, b] = await Promise.all(["Build yours", "Shop the catalog"].map((name) => page.getByRole("link", { name }).boundingBox()));
    expect(Math.round(a!.width), `at ${width}px`).toBe(Math.round(b!.width));
  }
});

test("the empty bag buttons fit in their column and have the same width", async ({ page }) => {
  await page.goto("/bag");
  await page.evaluate(() => localStorage.setItem("relic-bag", "[]"));
  // 768px to 1023px is the tablet layout, where the column is next to the summary.
  for (const width of [320, 393, 559, 768, 820, 1023, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    const column = (await page.locator("main").boundingBox())!;
    const boxes = await Promise.all(
      ["Shop parts", "Configure your own"].map(async (name) => (await page.locator("main").getByRole("link", { name }).boundingBox())!),
    );
    for (const b of boxes) expect(b.x + b.width, `at ${width}px`).toBeLessThanOrEqual(column.x + column.width);
    expect(boxes[0].width, `at ${width}px`).toBe(boxes[1].width);
  }
});

test("the empty bag button labels stay inside the buttons in a very narrow window", async ({ page }) => {
  await page.goto("/bag");
  await page.evaluate(() => localStorage.setItem("relic-bag", "[]"));
  // At 160px the button is narrower than the one-line label.
  await page.setViewportSize({ width: 160, height: 900 });
  await page.reload();
  for (const name of ["Shop parts", "Configure your own"]) {
    // Compare the box of the text itself with the box of the button.
    const [text, button] = await page.locator("main").getByRole("link", { name }).evaluate((e) => {
      const range = document.createRange();
      range.selectNodeContents(e);
      const t = range.getBoundingClientRect();
      const b = e.getBoundingClientRect();
      return [{ left: t.left, right: t.right }, { left: b.left, right: b.right }];
    });
    expect(text.left, name).toBeGreaterThanOrEqual(button.left);
    expect(text.right, name).toBeLessThanOrEqual(button.right);
  }
});

test("the empty bag buttons clip a label that cannot fit, so no text shows outside them", async ({ page }) => {
  await page.goto("/bag");
  await page.evaluate(() => localStorage.setItem("relic-bag", "[]"));
  // At 75px the word "Configure" alone is wider than the button.
  await page.setViewportSize({ width: 75, height: 900 });
  await page.reload();
  for (const name of ["Shop parts", "Configure your own"]) {
    const link = page.locator("main").getByRole("link", { name });
    const wider = await link.evaluate((e) => {
      const range = document.createRange();
      range.selectNodeContents(e);
      return range.getBoundingClientRect().width > e.getBoundingClientRect().width;
    });
    if (wider) await expect(link, name).toHaveCSS("overflow-x", "hidden");
  }
});

// ---- Checkout ----

const FLAT_CAP = { key: "Flat Cap|Aluminium · Painted", type: "Caps", name: "Flat Cap", spec: "Aluminium · Painted", price: 32, qty: 1, image: null };

async function saveBag(page: import("@playwright/test").Page, items: object[]) {
  await page.goto("/bag");
  await page.evaluate((items) => localStorage.setItem("relic-bag", JSON.stringify(items)), items);
  await page.reload();
}

// A bag with three lines (4 items): a stem, a bespoke stem and two caps. The bag is empty on a first visit.
const BESPOKE_STEM = { part: "stems", type: "Threadless", material: "Titanium", bond: "Welded", finish: "Polished", height: "40 mm", length: "90 mm", angle: "±17°" };
const DEMO_BAG = [
  { key: "Threadless Stem|Steel · Painted", type: "Stems", name: "Threadless Stem", spec: "Steel · Painted", price: 185, qty: 1, image: "/images/home/collage-threadless-stem.jpg" },
  { key: "Bespoke stems|Titanium", type: "Bespoke stem", name: "Bespoke Stem", spec: "Titanium", price: 600, qty: 1, image: "/images/bespoke/stems.jpg", bespoke: BESPOKE_STEM },
  { key: "Spacer Cap|Titanium · Raw", type: "Caps", name: "Spacer Cap", spec: "Titanium · Raw", price: 38, qty: 2, image: "/images/home/collage-spacer-cap.jpg" },
];

test.describe("checkout order check (server rules)", () => {
  const STEM = { part: "stems", type: "Threadless", material: "Steel", bond: "Brazed", finish: "Painted", color: "Green", height: "40 mm", length: "90 mm", angle: "±6°" };

  test("it prices catalogue items from the catalog and ignores a price from the browser", () => {
    const r = order({ zone: "uk", items: [{ name: "Flat Cap", qty: 2, price: 1, unitAmount: 1 }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.lines).toEqual([{ name: "Flat Cap", description: "Aluminium · Painted", unitAmount: 3200, quantity: 2, priceId: "price_4" }]);
    expect(r.order.subtotal).toBe(64);
  });

  test("it prices a bespoke part from its options, and ignores a price and other fields", () => {
    const r = order({ zone: "uk", items: [{ bespoke: { ...STEM, price: 1 }, qty: 1, price: 1 }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 220 × 1 (steel) × (1 + 0.10 brazed + 0.10 painted)
    expect(r.order.lines[0].unitAmount).toBe(26400);
    expect(r.order.lines[0].bespoke).toEqual(STEM);
  });

  test("a custom size costs more, and a custom size out of range is not valid", () => {
    const custom = order({ zone: "uk", items: [{ bespoke: { ...STEM, length: "95 mm" }, qty: 1 }] });
    expect(custom.ok && custom.order.lines[0].unitAmount).toBe(Math.round(220 * 1.3) * 100);
    for (const length of ["39 mm", "151 mm", "abc", "95mm"]) {
      expect(order({ zone: "uk", items: [{ bespoke: { ...STEM, length }, qty: 1 }] }).ok, length).toBe(false);
    }
  });

  test("it rejects what is not valid", () => {
    const bad: unknown[] = [
      null,
      "text",
      {},
      { zone: "mars", items: [{ name: "Flat Cap", qty: 1 }] },
      { zone: "uk", items: [] },
      { zone: "uk", items: [{ name: "Relic Quill", qty: 1 }] },
      { zone: "uk", items: [{ name: "Flat Cap", qty: 0 }] },
      { zone: "uk", items: [{ name: "Flat Cap", qty: 21 }] },
      { zone: "uk", items: [{ name: "Flat Cap", qty: 1.5 }] },
      { zone: "uk", items: [{ name: "Flat Cap", qty: "2" }] },
      { zone: "uk", items: [{ bespoke: { ...STEM, material: "Gold" }, qty: 1 }] },
      // Brazing is steel only.
      { zone: "uk", items: [{ bespoke: { ...STEM, material: "Aluminium" }, qty: 1 }] },
      // A flat cap has no height.
      { zone: "uk", items: [{ bespoke: { part: "caps", type: "Flat cap", material: "Steel", finish: "Raw", height: "5 mm" }, qty: 1 }] },
      // Painted needs a colour.
      { zone: "uk", items: [{ bespoke: { ...STEM, color: undefined }, qty: 1 }] },
      { zone: "uk", items: Array.from({ length: 51 }, () => ({ name: "Flat Cap", qty: 1 })) },
    ];
    for (const payload of bad) expect(order(payload).ok, JSON.stringify(payload)).toBe(false);
  });

  test("delivery: UK is free from £100, other zones always have a price", () => {
    const cost = (zone: string, qty: number) => {
      const r = order({ zone, items: [{ name: "Flat Cap", qty }] });
      return r.ok ? r.order.shipping : NaN;
    };
    expect(cost("uk", 3)).toBe(6); // £96
    expect(cost("uk", 4)).toBe(0); // £128
    expect(cost("europe", 4)).toBe(15);
    expect(cost("world", 4)).toBe(25);
  });
});

test.describe("checkout API", () => {
  test("it answers 400 for an order that is not valid, before it talks to Stripe", async ({ request }) => {
    for (const data of ["not json", "{}", JSON.stringify({ zone: "uk", items: [{ name: "Nothing", qty: 1 }] })]) {
      const res = await request.post("/api/checkout", { headers: { "content-type": "application/json" }, data });
      expect(res.status(), data).toBe(400);
      expect(await res.json()).toHaveProperty("error");
    }
  });

  test("it answers 413 for a very large body", async ({ request }) => {
    const res = await request.post("/api/checkout", { headers: { "content-type": "application/json" }, data: "x".repeat(60_000) });
    expect(res.status()).toBe(413);
  });
});

test.describe("bag checkout", () => {
  test("it sends names, quantities and bespoke options, with no price, and goes to the payment page", async ({ page }) => {
    let body: any;
    await page.route("**/api/checkout", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "/support" }) });
    });
    await saveBag(page, DEMO_BAG);
    await page.getByRole("button", { name: "Checkout" }).click();
    await page.waitForURL("**/support");

    expect(body.zone).toBe("uk");
    expect(body.items).toEqual([
      { name: "Threadless Stem", qty: 1 },
      { bespoke: { part: "stems", type: "Threadless", material: "Titanium", bond: "Welded", finish: "Polished", height: "40 mm", length: "90 mm", angle: "±17°" }, qty: 1 },
      { name: "Spacer Cap", qty: 2 },
    ]);
    expect(JSON.stringify(body)).not.toMatch(/price|amount/i);
  });

  test("it shows the error of the server and lets the customer try again", async ({ page }) => {
    await page.route("**/api/checkout", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Checkout is not available yet." }) }));
    await saveBag(page, DEMO_BAG);
    const checkout = page.getByRole("button", { name: "Checkout" });
    await checkout.click();
    await expect(page.locator("aside").getByRole("alert")).toHaveText("Checkout is not available yet.");
    await expect(checkout).toBeEnabled();
  });

  test("it is off while the payment page opens, so a double click sends one order", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/checkout", async (route) => {
      calls++;
      await new Promise((r) => setTimeout(r, 300));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "/support" }) });
    });
    await saveBag(page, DEMO_BAG);
    await page.getByRole("button", { name: "Checkout" }).dblclick();
    await page.waitForURL("**/support");
    expect(calls).toBe(1);
  });

  test("the delivery zone changes the delivery price and the total", async ({ page }) => {
    await saveBag(page, [FLAT_CAP]);
    const summary = page.locator("aside");
    await expect(summary).toContainText("United Kingdom shipping");
    await expect(summary).toContainText("£6");
    await expect(summary).toContainText("£38");
    await page.getByLabel("Deliver to").selectOption("europe");
    await expect(summary).toContainText("Europe shipping");
    await expect(summary).toContainText("£47");
    await page.getByLabel("Deliver to").selectOption("world");
    await expect(summary).toContainText("£57");
  });

  test("the zone is sent to the server", async ({ page }) => {
    let zone = "";
    await page.route("**/api/checkout", async (route) => {
      zone = route.request().postDataJSON().zone;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "/support" }) });
    });
    await saveBag(page, [FLAT_CAP]);
    await page.getByLabel("Deliver to").selectOption("europe");
    await page.getByRole("button", { name: "Checkout" }).click();
    await page.waitForURL("**/support");
    expect(zone).toBe("europe");
  });

  test("a saved price that is old is replaced by the price of the catalog", async ({ page }) => {
    await saveBag(page, [{ ...FLAT_CAP, price: 1 }]);
    await expect(page.locator("main")).toContainText("£32");
  });

  test("a bespoke part in an old format and a product that is not for sale are dropped", async ({ page }) => {
    await saveBag(page, [
      FLAT_CAP,
      { key: "Bespoke Stem|demo", type: "Bespoke stem", name: "Bespoke Stem", spec: "old", price: 290, qty: 1, image: null, bespoke: true },
      { key: "Relic Quill|x", type: "Stems", name: "Relic Quill", spec: "x", price: 210, qty: 1, image: null },
    ]);
    await expect(page.locator("main")).toContainText("1 items");
  });

  test("the bag is empty on a first visit", async ({ page }) => {
    await page.goto("/");
    expect(await page.evaluate(() => localStorage.getItem("relic-bag"))).toBeNull();
    await expect(page.getByRole("link", { name: /^Bag \(0\)$/i })).toBeVisible();
    await page.goto("/bag");
    await expect(page.getByText("Your bag is empty.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Checkout" })).toBeDisabled();
  });

  test("the plus button stops at 20 of one item", async ({ page }) => {
    await saveBag(page, [{ ...FLAT_CAP, qty: 19 }]);
    const plus = page.getByRole("button", { name: "Add one Flat Cap" });
    await plus.click();
    await expect(plus).toBeDisabled();
  });

  test("the support page has the same delivery prices as the bag", async ({ page }) => {
    await page.goto("/support");
    const shipping = page.locator("#shipping");
    for (const text of ["United Kingdom", "£6", "Europe", "£15", "Rest of world", "£25"]) await expect(shipping).toContainText(text);
  });
});

test.describe("order confirmation", () => {
  test("it does not confirm an order that Stripe has not confirmed, and it keeps the bag", async ({ page }) => {
    await saveBag(page, DEMO_BAG);
    await page.goto("/checkout/success");
    await expect(page.getByText("We could not confirm a payment.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Thank you." })).toHaveCount(0);
    await page.goto("/bag");
    await expect(page.locator("main")).toContainText("4 items");
  });
});

test.describe("bespoke order", () => {
  test("the price follows the options, and the button adds the part to the bag", async ({ page }) => {
    await page.goto("/bespoke");
    const price = page.getByText("Your price").locator("..").locator(".subheading");
    // Steel, brazed, painted: 220 × 1.2
    await expect(price).toHaveText("£264");
    await page.getByRole("button", { name: "Polished", exact: true }).click();
    await expect(price).toHaveText("£275");
    await page.getByRole("button", { name: "Titanium", exact: true }).click();
    // Titanium is not steel, so the bond is welded (no brazing extra): 220 × 1.4 × 1.15
    await expect(price).toHaveText("£354");

    await page.getByRole("button", { name: "Add to bag" }).click();
    await expect(page.getByRole("status")).toContainText("Added to your bag");
    await page.getByRole("link", { name: "View bag" }).click();
    await expect(page.locator("main")).toContainText("Bespoke Stem");
    await expect(page.locator("main")).toContainText("Threadless · Titanium · Welded · Polished · 40 mm height · 90 mm · ±6°");
    await expect(page.locator("main")).toContainText("£354");
  });

  test("a custom size that is out of range turns the button off and says what the limits are", async ({ page }) => {
    await page.goto("/bespoke");
    const add = page.getByRole("button", { name: "Add to bag" });
    await page.getByRole("button", { name: "Custom" }).nth(1).click(); // the length chips
    await expect(add).toBeDisabled();
    await expect(page.getByRole("status")).toContainText("length 40–150 mm");
    await page.getByPlaceholder("e.g. 95").fill("200");
    await expect(add).toBeDisabled();
    await page.getByPlaceholder("e.g. 95").fill("95");
    await expect(add).toBeEnabled();
  });

  test("a flat cap and a spacer cap are priced from their own options", async ({ page }) => {
    await page.goto("/bespoke");
    await page.getByRole("button", { name: "Caps", exact: true }).click();
    const price = page.getByText("Your price").locator("..").locator(".subheading");
    // Steel, painted: 40 × 1.1
    await expect(price).toHaveText("£44");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.goto("/bag");
    await expect(page.locator("main")).toContainText("Bespoke Cap");
    await expect(page.locator("main")).toContainText("Flat cap · Steel · Painted Green");
  });
});

test("the pages have the share image in the metadata, with a full address", async ({ page, request }) => {
  for (const path of ["/", "/shop", "/bespoke", "/workshop"]) {
    await page.goto(path);
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    const twitter = await page.locator('meta[name="twitter:image"]').getAttribute("content");
    // The host depends on NEXT_PUBLIC_SITE_URL, so compare only the path.
    for (const url of [og, twitter]) {
      expect(url, path).toMatch(/^https?:\/\//);
      expect(new URL(url!).pathname, path).toBe("/images/brand/og-image.svg");
    }
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Relic Works");
  }
  expect((await request.get("/images/brand/og-image.svg")).status()).toBe(200);
});

test("the footer is at the bottom of the window on a short page, and at the end of a long page", async ({ page }) => {
  await expectFooterAtBottom(page);
});

// ---- The JSON data files ----

test.describe("data files", () => {
  const clone = <T>(v: T): T => structuredClone(v);

  test("the products, zones and bespoke options are valid", () => {
    // The files are checked when they load, so this runs only if the real data is valid.
    expect(CATALOG.products).toHaveLength(6);
    expect(parseZones(shippingJson).map((z) => z.id)).toEqual(["uk", "europe", "world"]);
    expect(parseBespokeData(bespokeJson).defaults.material).toBe("Steel");
  });

  test("every bespoke image is a file in public/images", () => {
    const paths = PART_IDS.map((id) => `/images/bespoke/${id}.jpg`);
    for (const path of paths) expect(existsSync(join("public", path)), path).toBe(true);
  });

  test("every price is a whole number of pence, so Stripe accepts it", () => {
    for (const p of CATALOG.products) {
      const r = order({ zone: "uk", items: [{ name: p.name, qty: 1 }] });
      expect(r.ok && Number.isInteger(r.order.lines[0].unitAmount), p.name).toBe(true);
    }
  });

  test("the catalog has the categories, materials, finishes and order of the Stripe products", () => {
    expect(CATALOG.categories).toEqual(["Stems", "Spacers", "Caps"]);
    expect(CATALOG.materials).toEqual(["Steel", "Aluminium", "Titanium"]);
    expect(CATALOG.products.map((p) => p.name)).toEqual(productsJson.products.map((p) => p.name));
    expect(CATALOG.products[4]).toMatchObject({ id: "prod_4", priceId: "price_4", name: "Flat Cap", price: 32 });
  });

  test("a product with a price such as 19.99 gives whole pence", () => {
    // 19.99 * 100 is 1998.9999999999998 in floating-point numbers. Stripe keeps the price in pence.
    const list = fakeStripeProducts(productsJson);
    (list[4].default_price as Stripe.Price).unit_amount = 1999;
    const product = parseStripeProducts(list).products[4];
    expect(product.price).toBe(19.99);
    const r = buildOrder({ zone: "uk", items: [{ name: "Flat Cap", qty: 1 }] }, [product]);
    expect(r.ok && r.order.lines[0].unitAmount).toBe(1999);
  });

  test("a product with no image yet is in the catalog with a null image", () => {
    const list = fakeStripeProducts(productsJson);
    list[0].images = [];
    expect(parseStripeProducts(list).products[0].image).toBeNull();
  });

  test("a product that is not active is not in the catalog", () => {
    const list = fakeStripeProducts(productsJson);
    list[0].active = false;
    expect(parseStripeProducts(list).products).toHaveLength(5);
  });

  test("a wrong Stripe product is refused, and the message names the product", () => {
    const bad = (change: (l: Stripe.Product[]) => void) => {
      const list = fakeStripeProducts(productsJson);
      change(list);
      return () => parseStripeProducts(list);
    };
    expect(bad((l) => (l[1].name = l[0].name))).toThrow(/Stripe product "Quill Stem": more than one active product has this name/);
    expect(bad((l) => delete l[0].metadata.category)).toThrow(/Stripe product "Quill Stem" \(prod_0\): the metadata "category" is missing/);
    expect(bad((l) => (l[0].default_price = null))).toThrow(/Quill Stem" \(prod_0\): it has no default price/);
    expect(bad((l) => ((l[0].default_price as Stripe.Price).currency = "usd"))).toThrow(/its price is in USD/);
    expect(bad((l) => ((l[0].default_price as Stripe.Price).unit_amount = 0))).toThrow(/its price must be above 0/);
    expect(bad((l) => (l[0].metadata.order = "first"))).toThrow(/the metadata "order" must be a number/);
  });

  test("a wrong delivery zone is refused", () => {
    const bad = (change: (d: typeof shippingJson) => void) => {
      const d = clone(shippingJson);
      change(d);
      return () => parseZones(d);
    };
    expect(bad((d) => (d.zones[1].id = "uk"))).toThrow(/zones\[1\]\.id: "uk" is used by more than one zone/);
    expect(bad((d) => (d.zones[0].price = -1))).toThrow(/zones\[0\]\.price: must be a number of 0/);
    expect(bad((d) => (d.zones[0].countries = ["gb"]))).toThrow(/must be a two-letter country code in capitals/);
    expect(bad((d) => d.zones[2].countries.push("GB"))).toThrow(/GB is in the zone "uk" and in the zone "world"/);
    expect(bad((d) => (d.zones = []))).toThrow(/zones: must have at least one zone/);
  });

  test("a wrong bespoke option is refused, and the names that the code needs must stay", () => {
    const bad = (change: (d: typeof bespokeJson) => void) => {
      const d = clone(bespokeJson);
      change(d);
      return () => parseBespokeData(d);
    };
    expect(bad((d) => Object.assign(d.parts.caps.type, { options: ["Spacer cap"], initial: "Spacer cap" }))).toThrow(/parts\.caps\.type\.options: must include "Flat cap"/);
    expect(bad((d) => Object.assign(d, { materials: ["Titanium", "Aluminium"], defaults: { ...d.defaults, material: "Titanium" } }))).toThrow(/materials: must include "Steel"/);
    expect(bad((d) => (d.defaults.color = "Pink"))).toThrow(/defaults\.color: "Pink" is not one of/);
    expect(bad((d) => (d.parts.stems.type.initial = "Nope"))).toThrow(/parts\.stems\.type\.initial/);
    expect(bad((d) => (d.colors[0].hex = "blue"))).toThrow(/colors\[0\]\.hex: "blue" must be a colour such as #1f7a3d/);
    expect(bad((d) => delete (d.pricing.materialFactor as Record<string, number>).Titanium)).toThrow(/pricing\.materialFactor\.Titanium: must be a number above 0/);
    expect(bad((d) => (d.customRange.length = [150, 40]))).toThrow(/customRange\.length: must be two numbers, the lowest first/);
    expect(bad((d) => (d.parts.stems.basePrice = 0))).toThrow(/parts\.stems\.basePrice/);
  });
});
