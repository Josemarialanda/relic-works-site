import { expect, test } from "@playwright/test";
import { expectFooterAtBottom } from "./helpers";

test("the shop shows the filters, with no toggle", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.locator("button[aria-controls=shop-filters]")).toBeHidden();
  await expect(page.locator("#shop-filters")).toBeVisible();
});

test("the footer is at the bottom of the window on a short page, and at the end of a long page", async ({ page }) => {
  await expectFooterAtBottom(page);
});
