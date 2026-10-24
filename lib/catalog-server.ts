// Read the catalog from Stripe. Only server code uses this file. The result is cached for a minute, so a
// change in the Stripe dashboard shows on the site in about a minute, with no new deploy.

import { unstable_cache } from "next/cache";
import type { Catalog } from "./catalog";
import { parseStripeProducts } from "./catalog-stripe";
import { getStripe } from "./stripe";

const MAX_PRODUCTS = 500;

// The catalog now, with no cache. The checkout uses it, so an order sees the newest price and stock.
export async function loadCatalog(): Promise<Catalog> {
  const stripe = getStripe();
  if (!stripe) throw new Error("STRIPE_SECRET_KEY is not set. The shop reads its products from Stripe, so the site needs the key to build and to run.");
  const list = await stripe.products.list({ active: true, expand: ["data.default_price"], limit: 100 }).autoPagingToArray({ limit: MAX_PRODUCTS });
  return parseStripeProducts(list);
}

// The catalog for the pages. The Stripe webhook clears this cache after a sale.
export const getCatalog = unstable_cache(
  loadCatalog,
  ["catalog"],
  { revalidate: 60, tags: ["catalog"] },
);
