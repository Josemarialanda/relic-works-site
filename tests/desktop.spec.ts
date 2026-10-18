import { expect, test } from "@playwright/test";
import { heroDots, heroSlide, sizes } from "./helpers";

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
      for (const src of srcs) expect(src).toContain(`${folder}collage-`);
    }
  });

  test("the lightbox shows the photo of the tile", async ({ page }) => {
    await page.goto("/workshop");
    await page.locator("button[title='View Flat Cap']").click();
    await expect(page.locator("img[src='/images/workshop/collage-flat-cap.svg']")).toHaveCount(2);
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
