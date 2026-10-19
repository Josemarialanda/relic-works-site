// Check an order from the browser and price it. The browser sends only names, quantities and bespoke
// options. This file takes every price from the Stripe catalog and the bespoke rules, so the browser cannot
// change a price. The route handler in app/api/checkout calls it before it talks to Stripe.

import { PART_NAME } from "../data/bespoke";
import { bespokePrice, bespokeSpec, parseBespoke, type BespokeConfig } from "./bespoke";
import { MAX_QTY, productByName, type Product } from "./catalog";
import type { Zone } from "../data/shipping";
import { shippingCost, zoneById } from "./shipping";

export type OrderLine = {
  name: string;
  description: string;
  // The price of one item in pence.
  unitAmount: number;
  quantity: number;
  // The Stripe price of a catalog product. A bespoke part has none, and its price goes in with the order.
  priceId?: string;
  bespoke?: BespokeConfig;
};

export type Order = {
  zone: Zone;
  lines: OrderLine[];
  // In pounds.
  subtotal: number;
  shipping: number;
};

export type OrderResult = { ok: true; order: Order } | { ok: false; error: string };

const MAX_LINES = 50;

const fail = (error: string): OrderResult => ({ ok: false, error });

export function buildOrder(payload: unknown, products: readonly Product[]): OrderResult {
  if (typeof payload !== "object" || payload === null) return fail("The order is not valid.");
  const { zone: zoneId, items } = payload as Record<string, unknown>;

  const zone = zoneById(zoneId);
  if (!zone) return fail("Choose where to deliver to.");
  if (!Array.isArray(items) || items.length === 0) return fail("Your bag is empty.");
  if (items.length > MAX_LINES) return fail("There are too many items in the bag.");

  const lines: OrderLine[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) return fail("The order is not valid.");
    const { name, bespoke, qty } = item as Record<string, unknown>;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return fail(`The quantity of an item must be from 1 to ${MAX_QTY}.`);
    }

    if (bespoke !== undefined) {
      const config = parseBespoke(bespoke);
      if (!config) return fail("A bespoke part in your bag is not valid. Remove it and configure it again.");
      lines.push({
        name: `Bespoke ${PART_NAME[config.part]}`,
        description: `${bespokeSpec(config)}. Made to order: ships in 3–4 weeks.`,
        unitAmount: Math.round(bespokePrice(config) * 100),
        quantity: qty,
        bespoke: config,
      });
      continue;
    }

    const product = typeof name === "string" ? productByName(products, name) : undefined;
    if (!product) return fail("A product in your bag is not for sale now. Remove it and try again.");
    // Round, because a price such as 19.99 times 100 is not exactly 1999 as a floating-point number, and Stripe needs whole pence.
    const unitAmount = Math.round(product.price * 100);
    lines.push({ name: product.name, description: `${product.mat} · ${product.fin}`, unitAmount, quantity: qty, priceId: product.priceId });
  }

  const subtotal = lines.reduce((sum, l) => sum + (l.unitAmount / 100) * l.quantity, 0);
  return { ok: true, order: { zone, lines, subtotal, shipping: shippingCost(zone, subtotal) } };
}
