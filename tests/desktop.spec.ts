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
import { applySale } from "../lib/stock";
import { slugify } from "../lib/catalog";
import { FIRST_STEM, stemParams } from "../lib/stem-model";
import { minClampHeightMm } from "../lib/stem-geometry";
import Stripe from "stripe";
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
    // The products come from Stripe and can change, so skip when no product can be bought.
    test.skip((await add.count()) === 0, "the shop has no product to buy");
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

test.describe("3D stem on the bespoke page", () => {
  // No sway and no slide: a change shows at once.
  test.use({ reducedMotion: "reduce" });

  const model = (page: import("@playwright/test").Page) => page.locator("canvas[data-length]");
  // The mean colour of the pixels that the stem covers. The canvas is clear around the stem.
  const meanColor = (page: import("@playwright/test").Page) =>
    model(page).evaluate((c: HTMLCanvasElement) => {
      const t = document.createElement("canvas");
      t.width = c.width;
      t.height = c.height;
      const x = t.getContext("2d")!;
      x.drawImage(c, 0, 0);
      const d = x.getImageData(0, 0, t.width, t.height).data;
      let n = 0;
      let rgb = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 40) continue;
        n++;
        rgb = rgb.map((v, k) => v + d[i + k]);
      }
      return { n, rgb: rgb.map((v) => v / Math.max(n, 1)) };
    });

  test("each tab shows a 3D model that follows its options, and each part keeps its own options", async ({ page }) => {
    await page.goto("/bespoke");
    await expect(model(page)).toHaveAttribute("data-type", "Threadless");
    await expect(model(page)).toHaveAttribute("data-length", "90");
    await expect(model(page)).toHaveAttribute("data-height", "45");
    await expect(model(page)).toHaveAttribute("data-angle", "0");
    await expect(model(page)).toHaveAttribute("data-finish", "Raw");
    await expect(model(page)).toHaveAttribute("data-material", "Steel");

    // The material changes the colour of the metal, not the shape.
    await page.getByRole("button", { name: "Titanium", exact: true }).click();
    await expect(model(page)).toHaveAttribute("data-material", "Titanium");

    await page.getByRole("group", { name: "Length" }).getByRole("button", { name: "60 mm" }).click();
    await expect(model(page)).toHaveAttribute("data-length", "60");
    await page.getByRole("group", { name: /^Height/ }).getByRole("button", { name: "60 mm" }).click();
    await expect(model(page)).toHaveAttribute("data-height", "60");
    await page.getByRole("button", { name: "-17°", exact: true }).click();
    await expect(model(page)).toHaveAttribute("data-angle", "-17");
    await page.getByRole("button", { name: "Quill" }).click();
    await expect(model(page)).toHaveAttribute("data-type", "Quill");
    await page.getByRole("button", { name: "Welded" }).click();
    await expect(model(page)).toHaveAttribute("data-bond", "Welded");
    await page.getByRole("button", { name: "Polished" }).click();
    await expect(model(page)).toHaveAttribute("data-finish", "Polished");

    // The spacers and the caps have a 3D model too, which follows their options.
    await page.getByRole("button", { name: "Spacers" }).click();
    await expect(model(page)).toHaveAttribute("data-part", "spacers");
    await page.getByRole("group", { name: "Steerer size" }).getByRole("button", { name: '1"', exact: true }).click();
    await expect(model(page)).toHaveAttribute("data-spacer-size", '1"');
    await page.getByRole("group", { name: "Height" }).getByRole("button", { name: "20 mm" }).click();
    await expect(model(page)).toHaveAttribute("data-part-height", "20");
    await page.getByRole("button", { name: "Caps", exact: true }).click();
    await expect(model(page)).toHaveAttribute("data-part", "caps");
    await expect(model(page)).toHaveAttribute("data-cap-type", "Flat cap");
    await page.getByRole("button", { name: "Spacer cap", exact: true }).click();
    await expect(model(page)).toHaveAttribute("data-cap-type", "Spacer cap");
    await page.getByRole("group", { name: "Integrated spacer height" }).getByRole("button", { name: "10 mm" }).click();
    await expect(model(page)).toHaveAttribute("data-part-height", "10");
    // The stem keeps its own options.
    await page.getByRole("button", { name: "Stems", exact: true }).click();
    await expect(model(page)).toHaveAttribute("data-part", "stems");
    await expect(model(page)).toHaveAttribute("data-height", "60");
  });

  test("with no WebGL, each part shows its photo", async ({ page }) => {
    await page.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      // @ts-expect-error The test blocks WebGL, as in a browser that has none.
      HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
        return type.startsWith("webgl") ? null : get.call(this, type as "2d", ...(rest as []));
      };
    });
    await page.goto("/bespoke");
    for (const [tab, name] of [["Stems", "Bespoke stems"], ["Spacers", "Bespoke spacers"], ["Caps", "Bespoke caps"]]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      await expect(page.getByRole("img", { name })).toBeVisible();
      await expect(model(page)).toHaveCount(0);
    }
  });

  test("the custom size sliders move the model, and a steerer clamp over 70 mm has four bolts", async ({ page }) => {
    await page.goto("/bespoke");
    await page.getByRole("button", { name: "Custom" }).nth(1).click(); // Length (the order is height, length, angle)
    const length = page.getByRole("slider", { name: /Custom length/ });
    // The slider starts at the chip that was picked before it.
    await expect(length).toHaveValue("90");
    await length.fill("100");
    await expect(model(page)).toHaveAttribute("data-length", "100");
    await page.getByRole("button", { name: "Custom" }).nth(2).click();
    await page.getByRole("slider", { name: /Custom angle/ }).fill("-20");
    await expect(model(page)).toHaveAttribute("data-angle", "-20");
    await page.getByRole("button", { name: "Custom" }).nth(0).click();
    await page.getByRole("slider", { name: /Custom height/ }).fill("80");
    await expect(model(page)).toHaveAttribute("data-height", "80");
    await expect(model(page)).toHaveAttribute("data-bolts", "4");
    await page.getByRole("slider", { name: /Custom height/ }).fill("70");
    await expect(model(page)).toHaveAttribute("data-bolts", "2");
  });

  test("the material does not change the shape of the stem", async ({ page }) => {
    await page.goto("/bespoke");
    await page.getByRole("button", { name: "Raw", exact: true }).click();
    const area = async () => {
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      return (await meanColor(page)).n;
    };
    const counts: number[] = [];
    for (const material of ["Steel", "Titanium"]) {
      await page.getByRole("button", { name: material, exact: true }).click();
      await expect(model(page)).toHaveAttribute("data-material", material);
      counts.push(await area());
    }
    // The covered pixels are the same for every material. The edges can differ by a few pixels.
    for (const n of counts) expect(Math.abs(n - counts[0])).toBeLessThan(counts[0] * 0.005);
  });

  test("a brazed joint shows brass, and a welded joint does not", async ({ page }) => {
    await page.goto("/bespoke");
    await expect(model(page)).toHaveAttribute("data-bond", "Brazed");
    await page.waitForTimeout(500);
    // Steel is grey, brass is yellow: the red channel is higher than the blue channel by more.
    const warmth = async () => {
      const c = await meanColor(page);
      return c.rgb[0] - c.rgb[2];
    };
    const brazed = await warmth();
    await page.getByRole("button", { name: "Welded", exact: true }).click();
    await expect(model(page)).toHaveAttribute("data-bond", "Welded");
    await expect.poll(async () => (await warmth()) < brazed - 0.1).toBe(true);
  });

  test("the finish changes the pixels of the model", async ({ page }) => {
    await page.goto("/bespoke");
    await expect(model(page)).toHaveAttribute("data-finish", "Raw");
    await page.waitForTimeout(500);
    const raw = await meanColor(page);
    expect(raw.n).toBeGreaterThan(1000);
    await page.getByRole("button", { name: "Polished", exact: true }).click();
    await expect(model(page)).toHaveAttribute("data-finish", "Polished");
    await expect.poll(async () => JSON.stringify((await meanColor(page)).rgb.map(Math.round)) !== JSON.stringify(raw.rgb.map(Math.round))).toBe(true);
  });

  test("the model stays inside its box for both types, the materials, and the shortest and the longest stem", async ({ page }) => {
    await page.goto("/bespoke");
    await page.getByRole("button", { name: "35°", exact: true }).click();
    for (const [type, material, name] of [["Threadless", "Titanium", "60 mm"], ["Threadless", "Steel", "90 mm"], ["Quill", "Steel", "60 mm"], ["Quill", "Titanium", "90 mm"]]) {
      await page.getByRole("button", { name: type, exact: true }).click();
      await page.getByRole("button", { name: material, exact: true }).click();
      await page.getByRole("group", { name: "Length" }).getByRole("button", { name, exact: true }).click();
      await expect(model(page)).toHaveAttribute("data-length", name.replace(" mm", ""));
      // The model draws on the next frame.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const box = await model(page).evaluate((c: HTMLCanvasElement) => {
        const t = document.createElement("canvas");
        t.width = c.width;
        t.height = c.height;
        const x = t.getContext("2d")!;
        x.drawImage(c, 0, 0);
        const d = x.getImageData(0, 0, t.width, t.height).data;
        let x0 = t.width, y0 = t.height, x1 = -1, y1 = -1;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 40) continue;
          const px = (i / 4) % t.width;
          const py = Math.floor(i / 4 / t.width);
          x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
        }
        return { x0, y0, x1, y1, w: t.width, h: t.height };
      });
      expect(box.x1).toBeGreaterThan(box.x0);
      expect(box.x0).toBeGreaterThan(0);
      expect(box.y0).toBeGreaterThan(0);
      expect(box.x1).toBeLessThan(box.w - 1);
      expect(box.y1).toBeLessThan(box.h - 1);
    }
  });
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
  // The bespoke page shows 3D models; its photos show only with no WebGL (see the test of the 3D stem).
  for (const path of ["/", "/shop", "/bag", "/workshop"]) {
    test(`all images on ${path} load`, async ({ page }) => {
      // The bag is empty on a first visit, so the bag page needs items to show their images.
      if (path === "/bag") await saveBag(page, DEMO_BAG);
      await page.goto(path);
      const imgs = page.locator("main img, section img");
      // The shop images come from Stripe, so the shop can have none.
      if (path !== "/shop") expect(await imgs.count()).toBeGreaterThan(0);
      // Lazy images load only near the view, so scroll each one into view first.
      for (const img of await imgs.all()) {
        await img.scrollIntoViewIfNeeded();
        await expect(img).toHaveJSProperty("complete", true);
        expect(await img.evaluate((e: HTMLImageElement) => e.naturalWidth), (await img.getAttribute("src")) ?? "img").toBeGreaterThan(0);
      }
    });
  }

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
  // The products come from Stripe and can change, so skip when no product has an image.
  test.skip((await img.count()) === 0, "the shop has no product image");
  await expect(img).toHaveCSS("opacity", "0");
  release();
  // The blocks sharpen for about 0.4 s. Then the canvas is gone and the photo shows.
  await expect(img).toHaveCSS("opacity", "1");
  await expect(page.locator("main canvas")).toHaveCount(0);
});

test("a bag image is hidden behind a pixel pattern while it loads, then it shows", async ({ page }) => {
  // Open the bag page first, so that the saved bag exists before the images are held back.
  await saveBag(page, DEMO_BAG);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/_next/image**", async (route) => {
    await gate;
    await route.continue();
  });
  await page.reload();
  const img = page.locator("main img").first();
  await expect(img).toHaveCSS("opacity", "0");
  release();
  await expect(img).toHaveCSS("opacity", "1");
  await expect(page.locator("main canvas")).toHaveCount(0);
});

test.describe("product page", () => {
  test("an address with no product shows the page not found", async ({ page }) => {
    const res = await page.goto("/shop/no-such-product-in-stripe");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found." })).toBeVisible();
  });

  test("a product in the shop opens its page, which adds it to the bag, and the bag links back", async ({ page }) => {
    await page.goto("/shop");
    // The products come from Stripe and can change, so use the first product that the shop shows.
    const card = page.locator("main a[href^='/shop/']").first();
    test.skip((await card.count()) === 0, "the shop has no product");
    const href = await card.getAttribute("href");
    await card.click();
    await page.waitForURL(`**${href}`);
    const name = await page.getByRole("heading", { level: 1 }).innerText();
    await expect(page).toHaveTitle(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expect(page.getByRole("link", { name: /^← Shop/ })).toBeVisible();

    const add = page.getByRole("button", { name: /^(Add to bag|Sold out)$/ });
    test.skip(await add.isDisabled(), "the first product is sold out");
    await add.click();
    await expect(page.getByRole("link", { name: /^Bag \(1\)$/i })).toBeVisible();

    await page.goto("/bag");
    await page.locator(`main a[href='${href}']`).last().click();
    await page.waitForURL(`**${href}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  });

  test("a bespoke part in the bag has no link to a product page", async ({ page }) => {
    await saveBag(page, DEMO_BAG);
    await expect(page.locator("main a[href^='/shop/']")).toHaveCount(0);
  });
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
    test.skip((await page.locator("main img").count()) === 0, "the shop has no product image");
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

test.describe("stripe webhook", () => {
  const SECRET = "whsec_playwright_test_secret";
  const signed = (body: string, secret = SECRET) => ({ "stripe-signature": new Stripe("sk_test_unused").webhooks.generateTestHeaderString({ payload: body, secret }) });

  test("it refuses a call with no signature", async ({ request }) => {
    const res = await request.post("/api/stripe-webhook", { data: "{}" });
    expect(res.status()).toBe(400);
  });

  test("it refuses a call with a wrong signature", async ({ request }) => {
    const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } });
    expect((await request.post("/api/stripe-webhook", { data: body, headers: signed(body, "whsec_other") })).status()).toBe(400);
    expect((await request.post("/api/stripe-webhook", { data: body, headers: { "stripe-signature": "t=1,v1=abc" } })).status()).toBe(400);
  });

  test("it accepts a signed event that it does not use, and it does not call Stripe for it", async ({ request }) => {
    const body = JSON.stringify({ id: "evt_2", object: "event", type: "customer.created", data: { object: {} } });
    const res = await request.post("/api/stripe-webhook", { data: body, headers: signed(body) });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  test("it ignores a payment that is not paid yet", async ({ request }) => {
    const body = JSON.stringify({ id: "evt_3", object: "event", type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_status: "unpaid" } } });
    const res = await request.post("/api/stripe-webhook", { data: body, headers: signed(body) });
    expect(res.status()).toBe(200);
  });
});

test.describe("product range", () => {
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

async function saveBag(page: import("@playwright/test").Page, items: object[]) {
  await page.goto("/bag");
  await page.evaluate((items) => localStorage.setItem("relic-bag", JSON.stringify(items)), items);
  await page.reload();
}

// The bag tests use a bespoke part, because its price comes from data/bespoke.json. The shop products come from
// Stripe and can change at any time, so no test depends on a product name or a price. The bag is empty on a first visit.
const BESPOKE_STEM = { part: "stems", type: "Threadless", material: "Titanium", bond: "Welded", finish: "Polished", height: "45 mm", length: "90 mm", angle: "17°" };
const BESPOKE_ITEM = { key: "Bespoke stems|Titanium", type: "Bespoke stem", name: "Bespoke Stem", spec: "Titanium", price: 354, qty: 1, image: "/images/bespoke/stems.jpg", bespoke: BESPOKE_STEM };
const DEMO_BAG = [{ ...BESPOKE_ITEM, qty: 2 }];

test.describe("checkout order check (server rules)", () => {
  const STEM = { part: "stems", type: "Threadless", material: "Steel", bond: "Brazed", finish: "Raw", height: "45 mm", length: "90 mm", angle: "0°" };

  test("it prices catalogue items from the catalog and ignores a price from the browser", () => {
    const r = order({ zone: "uk", items: [{ name: "Flat Cap", qty: 2, price: 1, unitAmount: 1 }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.lines).toEqual([{ name: "Flat Cap", description: "Titanium · Brushed", unitAmount: 3200, quantity: 2, priceId: "price_4" }]);
    expect(r.order.subtotal).toBe(64);
  });

  test("it prices a bespoke part from its options, and ignores a price and other fields", () => {
    const r = order({ zone: "uk", items: [{ bespoke: { ...STEM, price: 1 }, qty: 1, price: 1 }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 220 × 1 (steel) × (1 + 0.10 brazed + 0 raw)
    expect(r.order.lines[0].unitAmount).toBe(24200);
    expect(r.order.lines[0].bespoke).toEqual(STEM);
  });

  test("a custom size costs more, and a custom size out of range is not valid", () => {
    // 220 × (1 + 0.10 brazed + 0.10 custom size)
    const custom = order({ zone: "uk", items: [{ bespoke: { ...STEM, length: "95 mm" }, qty: 1 }] });
    expect(custom.ok && custom.order.lines[0].unitAmount).toBe(Math.round(220 * 1.2) * 100);
    for (const length of ["59 mm", "131 mm", "abc", "95mm"]) {
      expect(order({ zone: "uk", items: [{ bespoke: { ...STEM, length }, qty: 1 }] }).ok, length).toBe(false);
    }
    for (const height of ["34 mm", "101 mm"]) {
      expect(order({ zone: "uk", items: [{ bespoke: { ...STEM, height }, qty: 1 }] }).ok, height).toBe(false);
    }
    for (const angle of ["-36°", "36°"]) {
      expect(order({ zone: "uk", items: [{ bespoke: { ...STEM, angle }, qty: 1 }] }).ok, angle).toBe(false);
    }
    // Spacers: 2.5–100 mm. Caps (the integrated spacer): 2.5–10 mm.
    const part = (p: string, type: string, height: string) =>
      order({ zone: "uk", items: [{ bespoke: { part: p, type, material: "Steel", finish: "Raw", height }, qty: 1 }] }).ok;
    expect(part("spacers", '1 1/8"', "2.5 mm")).toBe(true);
    expect(part("spacers", '1 1/8"', "100 mm")).toBe(true);
    expect(part("spacers", '1 1/8"', "2 mm")).toBe(false);
    expect(part("spacers", '1 1/8"', "100.5 mm")).toBe(false);
    expect(part("caps", "Spacer cap", "7.5 mm")).toBe(true);
    expect(part("caps", "Spacer cap", "10.5 mm")).toBe(false);
    expect(part("caps", "Spacer cap", "15 mm")).toBe(false);
  });

  test("a threadless steerer clamp must be tall enough for the angle, and a quill has no such limit", () => {
    // The lowest heights: 35 mm up to 10° up or down, 41 mm at 35°. See lib/stem-geometry.ts.
    expect(minClampHeightMm(6)).toBe(35);
    expect(minClampHeightMm(-6)).toBe(35);
    expect(minClampHeightMm(35)).toBe(41);
    for (let a = 0; a < 35; a++) expect(minClampHeightMm(a + 1)).toBeGreaterThanOrEqual(minClampHeightMm(a));
    const ok = (bespoke: object) => order({ zone: "uk", items: [{ bespoke: { ...STEM, ...bespoke }, qty: 1 }] }).ok;
    expect(ok({ height: "35 mm", angle: "0°" })).toBe(true);
    expect(ok({ height: "35 mm", angle: "35°" })).toBe(false);
    expect(ok({ height: "40 mm", angle: "35°" })).toBe(false);
    expect(ok({ height: "45 mm", angle: "35°" })).toBe(true);
    expect(ok({ height: "41 mm", angle: "-35°" })).toBe(true);
    expect(ok({ height: "40 mm", angle: "-35°" })).toBe(false);
    expect(ok({ type: "Quill", height: "35 mm", angle: "35°" })).toBe(true);
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
      { zone: "uk", items: [{ bespoke: { ...STEM, material: "Titanium" }, qty: 1 }] },
      // A flat cap has no height.
      { zone: "uk", items: [{ bespoke: { part: "caps", type: "Flat cap", material: "Steel", finish: "Raw", height: "5 mm" }, qty: 1 }] },
      // The page has no painted finish.
      { zone: "uk", items: [{ bespoke: { ...STEM, finish: "Painted", color: "Green" }, qty: 1 }] },
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
  test("it sends the bespoke options and quantities, with no price, and goes to the payment page", async ({ page }) => {
    let body: any;
    await page.route("**/api/checkout", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "/support" }) });
    });
    await saveBag(page, DEMO_BAG);
    await page.getByRole("button", { name: "Checkout" }).click();
    await page.waitForURL("**/support");

    expect(body.zone).toBe("uk");
    expect(body.items).toEqual([{ bespoke: BESPOKE_STEM, qty: 2 }]);
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
    await saveBag(page, [BESPOKE_ITEM]);
    const summary = page.locator("aside");
    // The part costs £354, so the UK delivery is free (free over £100).
    await expect(summary).toContainText("United Kingdom shipping");
    await expect(summary).toContainText("Free");
    await expect(summary).toContainText("£354");
    await page.getByLabel("Deliver to").selectOption("europe");
    await expect(summary).toContainText("Europe shipping");
    await expect(summary).toContainText("£369");
    await page.getByLabel("Deliver to").selectOption("world");
    await expect(summary).toContainText("£379");
  });

  test("the zone is sent to the server", async ({ page }) => {
    let zone = "";
    await page.route("**/api/checkout", async (route) => {
      zone = route.request().postDataJSON().zone;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "/support" }) });
    });
    await saveBag(page, [BESPOKE_ITEM]);
    await page.getByLabel("Deliver to").selectOption("europe");
    await page.getByRole("button", { name: "Checkout" }).click();
    await page.waitForURL("**/support");
    expect(zone).toBe("europe");
  });

  test("a saved price that is old is replaced by the price of the rules", async ({ page }) => {
    await saveBag(page, [{ ...BESPOKE_ITEM, price: 1 }]);
    await expect(page.locator("main")).toContainText("£354");
  });

  test("a bespoke part in an old format and a product that is not for sale are dropped", async ({ page }) => {
    await saveBag(page, [
      BESPOKE_ITEM,
      { key: "Bespoke Stem|demo", type: "Bespoke stem", name: "Bespoke Stem", spec: "old", price: 290, qty: 1, image: null, bespoke: true },
      { key: "Nothing|x", type: "Stems", name: "A product that is not in Stripe", spec: "x", price: 210, qty: 1, image: null },
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
    await saveBag(page, [{ ...BESPOKE_ITEM, qty: 19 }]);
    const plus = page.getByRole("button", { name: "Add one Bespoke Stem" });
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
    await expect(page.locator("main")).toContainText("2 items");
  });
});

test.describe("bespoke order", () => {
  test("the price follows the options, and the button adds the part to the bag", async ({ page }) => {
    await page.goto("/bespoke");
    const price = page.getByText("Your price").locator("..").locator(".subheading");
    // Steel, brazed, raw: 220 × 1.1
    await expect(price).toHaveText("£242");
    await page.getByRole("button", { name: "Polished", exact: true }).click();
    await expect(price).toHaveText("£275");
    await page.getByRole("button", { name: "Titanium", exact: true }).click();
    // Titanium is not steel, so the bond is welded (no brazing extra): 220 × 1.4 × 1.15
    await expect(price).toHaveText("£354");

    await page.getByRole("button", { name: "Add to bag" }).click();
    await expect(page.getByRole("status")).toContainText("Added to your bag");
    await page.getByRole("link", { name: "View bag" }).click();
    await expect(page.locator("main")).toContainText("Bespoke Stem");
    await expect(page.locator("main")).toContainText("Threadless · Titanium · Welded · Polished · 45 mm height · 90 mm · 0°");
    await expect(page.locator("main")).toContainText("£354");
  });

  test("the custom size sliders have the limits", async ({ page }) => {
    await page.goto("/bespoke");
    // A threadless stem can need more than 35 mm for its angle, so the quill shows the lowest height of the range.
    await page.getByRole("button", { name: "Quill", exact: true }).click();
    for (const [n, name, min, max] of [[0, /Custom height/, "35", "100"], [1, /Custom length/, "60", "130"], [2, /Custom angle/, "-35", "35"]] as const) {
      await page.getByRole("button", { name: "Custom" }).nth(n).click();
      const slider = page.getByRole("slider", { name });
      await expect(slider).toHaveAttribute("min", min);
      await expect(slider).toHaveAttribute("max", max);
      await expect(page.getByRole("button", { name: "Add to bag" })).toBeEnabled();
    }
    // Spacers and caps have a slider for a custom height too, in half millimetres.
    const add = page.getByRole("button", { name: "Add to bag" });
    await page.getByRole("button", { name: "Spacers", exact: true }).click();
    await page.getByRole("button", { name: "Custom" }).click();
    const spacer = page.getByRole("slider", { name: /Custom height/ });
    await expect(spacer).toHaveAttribute("min", "2.5");
    await expect(spacer).toHaveAttribute("max", "100");
    await expect(spacer).toHaveAttribute("step", "0.5");
    await spacer.fill("12.5");
    await expect(page.getByRole("slider", { name: /Custom height/ }).locator("..")).toContainText("12.5 mm");
    await expect(add).toBeEnabled();
    await page.getByRole("button", { name: "Caps", exact: true }).click();
    await page.getByRole("button", { name: "Spacer cap", exact: true }).click();
    await expect(page.getByRole("group", { name: "Integrated spacer height" }).getByRole("button")).toHaveText(["5 mm", "10 mm", "Custom"]);
    await page.getByRole("button", { name: "Custom" }).click();
    const cap = page.getByRole("slider", { name: /Custom height/ });
    await expect(cap).toHaveAttribute("min", "2.5");
    await expect(cap).toHaveAttribute("max", "10");
    await expect(add).toBeEnabled();
  });

  test("a steep angle locks the steerer clamp heights that are too short, and moves the height up", async ({ page }) => {
    await page.goto("/bespoke");
    await page.getByRole("button", { name: "35 mm", exact: true }).click();
    await page.getByRole("button", { name: "35°", exact: true }).click();
    await expect(page.getByRole("button", { name: "35 mm", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "45 mm", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("at least 41 mm for a 35° angle")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to bag" })).toBeEnabled();
    // The custom height slider starts at the lowest height that fits the angle.
    await page.getByRole("button", { name: "Custom" }).nth(0).click();
    await expect(page.getByRole("slider", { name: /Custom height/ })).toHaveAttribute("min", "41");
    await expect(page.getByRole("slider", { name: /Custom height/ })).toHaveValue("45");
    // A quill stem has no such limit.
    await page.getByRole("button", { name: "Quill", exact: true }).click();
    await expect(page.getByRole("button", { name: "35 mm", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Add to bag" })).toBeEnabled();
  });

  test("a flat cap and a spacer cap are priced from their own options", async ({ page }) => {
    await page.goto("/bespoke");
    await page.getByRole("button", { name: "Caps", exact: true }).click();
    const price = page.getByText("Your price").locator("..").locator(".subheading");
    // Steel, raw: 40 × 1
    await expect(price).toHaveText("£40");
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.goto("/bag");
    await expect(page.locator("main")).toContainText("Bespoke Cap");
    await expect(page.locator("main")).toContainText("Flat cap · Steel · Raw");
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

  test("the catalog has the categories, materials, finishes and order of the Stripe products", () => {
    expect(CATALOG.categories).toEqual(["Stems", "Spacers", "Caps"]);
    expect(CATALOG.materials).toEqual(["Steel", "Titanium"]);
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

  test("the metadata stock sets the stock of a product, and no stock means no limit", () => {
    const list = fakeStripeProducts(productsJson);
    list[0].metadata.stock = "5";
    list[1].metadata.stock = "0";
    const products = parseStripeProducts(list).products;
    expect(products.map((p) => p.stock)).toEqual([5, 0, null, null, null, null]);
    list[2].metadata.stock = "-1";
    expect(() => parseStripeProducts(list)).toThrow(/the metadata "stock" must be a whole number/);
    list[2].metadata.stock = "two";
    expect(() => parseStripeProducts(list)).toThrow(/the metadata "stock" must be a whole number/);
  });

  test("an order is refused when it is above the stock, and the lines of one product count together", () => {
    const list = fakeStripeProducts(productsJson);
    list[4].metadata.stock = "3";
    list[5].metadata.stock = "0";
    const { products } = parseStripeProducts(list);
    const ask = (items: unknown[]) => buildOrder({ zone: "uk", items }, products);
    expect(ask([{ name: "Flat Cap", qty: 3 }]).ok).toBe(true);
    const over = ask([{ name: "Flat Cap", qty: 4 }]);
    expect(!over.ok && over.error).toBe("Only 3 of Flat Cap left. Lower the quantity and try again.");
    const twice = ask([{ name: "Flat Cap", qty: 2 }, { name: "Flat Cap", qty: 2 }]);
    expect(!twice.ok && twice.error).toMatch(/Only 3 of Flat Cap left/);
    const gone = ask([{ name: "Spacer Cap", qty: 1 }]);
    expect(!gone.ok && gone.error).toBe("Spacer Cap is sold out. Remove it and try again.");
    // A product with no stock count has no limit, other than the limit of 20 for one line.
    expect(ask([{ name: "Quill Stem", qty: 20 }]).ok).toBe(true);
  });

  test("a sale lowers the stock, and an order that Stripe sends two times counts one time", () => {
    const first = applySale({ stock: "5" }, 2, "cs_test_a1b2c3d4e5f6g7h8i9j0");
    expect(first).toEqual({ stock: "3", stock_orders: "d4e5f6g7h8i9j0".slice(-12) });
    // The same order again, with the metadata that the first call made.
    expect(applySale({ stock: first!.stock, stock_orders: first!.stock_orders }, 2, "cs_test_a1b2c3d4e5f6g7h8i9j0")).toBeNull();
    // Another order is counted, and the stock never goes below 0.
    expect(applySale({ stock: "1", stock_orders: first!.stock_orders }, 4, "cs_test_zzzzzzzzzzzzzzzzzz")).toMatchObject({ stock: "0" });
    // No stock count, or a wrong one: no change.
    expect(applySale({}, 1, "cs_test_x")).toBeNull();
    expect(applySale({ stock: "many" }, 1, "cs_test_x")).toBeNull();
    // The list of counted orders keeps the last 30 only.
    let meta: Record<string, string> = { stock: "100" };
    for (let i = 0; i < 40; i++) meta = { ...meta, ...applySale(meta, 1, `cs_test_order${String(i).padStart(10, "0")}`)! };
    expect(meta.stock_orders.split(",")).toHaveLength(30);
    expect(meta.stock_orders.length).toBeLessThan(500);
  });

  test("a product page address comes from the name, and two products cannot share one", () => {
    expect(slugify('1 1/8" Spacer')).toBe("1-1-8-spacer");
    expect(slugify("  Flat Cap! ")).toBe("flat-cap");
    expect(CATALOG.products.map((p) => p.slug)).toEqual(["quill-stem", "threadless-stem", "1-spacer", "1-1-8-spacer", "flat-cap", "spacer-cap"]);
    const list = fakeStripeProducts(productsJson);
    list[1].name = "Quill-Stem";
    expect(() => parseStripeProducts(list)).toThrow(/"Quill Stem" and "Quill-Stem" have the same page address \(\/shop\/quill-stem\)/);
    list[1].name = "***";
    expect(() => parseStripeProducts(list)).toThrow(/no letter or number/);
  });

  test("the description of a Stripe product is kept, and an empty one is null", () => {
    const list = fakeStripeProducts(productsJson);
    list[0].description = "  A quill stem.  ";
    list[1].description = "   ";
    const products = parseStripeProducts(list).products;
    expect(products[0].description).toBe("A quill stem.");
    expect(products[1].description).toBeNull();
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
    expect(bad((d) => Object.assign(d, { materials: ["Titanium"], defaults: { ...d.defaults, material: "Titanium" } }))).toThrow(/materials: must include "Steel"/);
    expect(bad((d) => (d.parts.stems.type.initial = "Nope"))).toThrow(/parts\.stems\.type\.initial/);
    expect(bad((d) => delete (d.pricing.materialFactor as Record<string, number>).Titanium)).toThrow(/pricing\.materialFactor\.Titanium: must be a number above 0/);
    expect(bad((d) => (d.customRange.length = [150, 40]))).toThrow(/customRange\.length: must be two numbers, the lowest first/);
    expect(bad((d) => (d.parts.stems.basePrice = 0))).toThrow(/parts\.stems\.basePrice/);
  });
});

test("the 3D stem takes its numbers from the options", () => {
  const base = { part: "stems" as const, type: "Threadless", material: "Steel", finish: "Raw", bond: "Welded", height: "45 mm", length: "80 mm", angle: "17°" };
  const raw = stemParams(base, FIRST_STEM);
  expect(raw).toMatchObject({ type: "Threadless", lengthMm: 80, heightMm: 45, riseDeg: 17, bond: "Welded", finish: "Raw" });
  // Bare metal shows the colour of the material.
  expect(stemParams({ ...base, material: "Titanium" }, FIRST_STEM).color).not.toBe(raw.color);
  expect(stemParams({ ...base, finish: "Polished" }, FIRST_STEM).roughness).toBeLessThan(raw.roughness);
  expect(stemParams({ ...base, finish: "Brushed" }, FIRST_STEM).brushed).toBe(true);
  // The material gives the colour of the bare metal, and nothing else.
  const metal = (material: string) => stemParams({ ...base, material }, FIRST_STEM);
  expect(metal("Steel")).toMatchObject({ material: "Steel" });
  expect(metal("Titanium").color).not.toBe(metal("Steel").color);
  expect({ ...metal("Titanium"), color: "", material: "" }).toEqual({ ...metal("Steel"), color: "", material: "" });
  // An angle can be negative, and a missing or wrong value keeps the value before.
  expect(stemParams({ ...base, angle: "-12°" }, FIRST_STEM).riseDeg).toBe(-12);
  expect(stemParams({ ...base, length: "" }, raw).lengthMm).toBe(80);
  expect(stemParams({ ...base, length: undefined, type: "Nonsense" }, raw)).toMatchObject({ lengthMm: 80, type: "Threadless" });
  // A spacer and a cap have their own height and type. The stem keeps its height.
  const spacer = stemParams({ part: "spacers", type: '1"', material: "Steel", finish: "Raw", height: "12.5 mm" }, raw);
  expect(spacer).toMatchObject({ part: "spacers", spacerSize: '1"', partHeightMm: 12.5, heightMm: 45 });
  const cap = stemParams({ part: "caps", type: "Flat cap", material: "Steel", finish: "Raw" }, spacer);
  expect(cap).toMatchObject({ part: "caps", capType: "Flat cap", partHeightMm: 12.5, spacerSize: '1"' });
});

test("the divider between the 3D view and the options goes the full height of the bespoke section", async ({ page }) => {
  await page.goto("/bespoke");
  const options = page.locator("#configure > div").nth(1);
  expect(await options.evaluate((e) => getComputedStyle(e).borderLeftWidth)).toBe("1px");
  const section = (await page.locator("#configure").boundingBox())!;
  const box = (await options.boundingBox())!;
  expect(box.height).toBeGreaterThan(section.height - 2);
});
