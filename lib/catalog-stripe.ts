// Turn the Stripe products into the catalog. A Stripe product is a shop product when it is active, it has a
// default price in pounds, and its metadata has `category`, `material` and `finish`. The optional metadata
// `order` (a number) sets the order of the "Featured" sort, and `bonding_method` (stems) tells how the parts are joined. The first image of the product is the shop image.
// A wrong product stops the build with a message that names the product, so a visitor never sees the error.

import type Stripe from "stripe";
import { slugify, type Catalog, type Product } from "./catalog";

function fail(product: Stripe.Product, problem: string): never {
  throw new Error(`Stripe product "${product.name}" (${product.id}): ${problem}`);
}

function meta(product: Stripe.Product, key: string): string {
  const v = product.metadata[key]?.trim();
  if (!v) fail(product, `the metadata "${key}" is missing. Add it in the Stripe dashboard.`);
  return v;
}

const unique = (list: string[]) => [...new Set(list)];

export function parseStripeProducts(stripeProducts: Stripe.Product[]): Catalog {
  const rows = stripeProducts
    .filter((p) => p.active)
    .map((p) => {
      const price = p.default_price;
      if (!price || typeof price === "string") fail(p, "it has no default price (or the price is not expanded).");
      if (price.currency !== "gbp") fail(p, `its price is in ${price.currency.toUpperCase()}, but the shop uses GBP.`);
      if (price.type !== "one_time") fail(p, "its default price repeats. The shop needs a one-time price.");
      if (!price.unit_amount || price.unit_amount <= 0) fail(p, "its price must be above 0.");
      const order = p.metadata.order === undefined ? Infinity : Number(p.metadata.order);
      if (Number.isNaN(order)) fail(p, `the metadata "order" must be a number, not "${p.metadata.order}".`);
      const stock = p.metadata.stock?.trim();
      if (stock !== undefined && !/^\d+$/.test(stock)) fail(p, `the metadata "stock" must be a whole number (0 or more), not "${stock}".`);
      const product: Product = {
        id: p.id,
        priceId: price.id,
        name: p.name.trim(),
        slug: slugify(p.name),
        description: p.description?.trim() || null,
        cat: meta(p, "category"),
        mat: meta(p, "material"),
        fin: meta(p, "finish"),
        bond: p.metadata.bonding_method?.trim() || null,
        price: price.unit_amount / 100,
        image: p.images[0] ?? null,
        stock: stock === undefined ? null : Number(stock),
      };
      return { product, order };
    })
    .sort((a, b) => a.order - b.order || a.product.name.localeCompare(b.product.name));

  const products = rows.map((r) => r.product);
  products.forEach((p, i) => {
    if (products.findIndex((q) => q.name === p.name) !== i) {
      throw new Error(`Stripe product "${p.name}": more than one active product has this name. A saved bag finds a product by its name.`);
    }
  });
  products.forEach((p, i) => {
    if (!p.slug) throw new Error(`Stripe product "${p.name}": the name has no letter or number, so it has no page address.`);
    const other = products.find((q, j) => j < i && q.slug === p.slug);
    if (other) throw new Error(`Stripe products "${other.name}" and "${p.name}" have the same page address (/shop/${p.slug}). Rename one.`);
  });
  return {
    categories: unique(products.map((p) => p.cat)),
    materials: unique(products.map((p) => p.mat)),
    finishes: unique(products.map((p) => p.fin)),
    products,
  };
}
