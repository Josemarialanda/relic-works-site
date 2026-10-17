import { expect, test } from "@playwright/test";

test("the shop shows the filters, with no toggle", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.locator("button[aria-controls=shop-filters]")).toBeHidden();
  await expect(page.locator("#shop-filters")).toBeVisible();
});
