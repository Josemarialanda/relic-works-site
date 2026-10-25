// The catalog types and helpers. The products come from Stripe (see catalog-server.ts), and the pages pass them to
// the browser code through the CatalogProvider. This file has no server code, so the browser can import it.

// The most of one item in an order. The bag and the checkout server both use it.
export const MAX_QTY = 20;

export type Category = string;
export type Material = string;
export type Finish = string;

export type Product = {
  // The Stripe product and its price. The checkout charges the Stripe price.
  id: string;
  priceId: string;
  name: string;
  // The address of the product page: /shop/<slug>. It comes from the name, so it is different for each product.
  slug: string;
  // The description of the Stripe product, or null when it has none.
  description: string | null;
  cat: Category;
  mat: Material;
  fin: Finish;
  // How the parts are joined (for example "Brazed" or "Welded"), from the metadata `bonding_method`. It is null for a
  // product that has no joints (a spacer or a cap).
  bond: string | null;
  // In pounds.
  price: number;
  // The first image of the Stripe product, or null when it has none yet.
  image: string | null;
  // The items in stock, from the metadata `stock`. It is null when the product has no limit.
  stock: number | null;
};

export type Catalog = { categories: Category[]; materials: Material[]; finishes: Finish[]; products: Product[] };

// The most of one product that an order can have: 20 or the stock, whichever is lower.
export const maxQty = (product: Product) => Math.min(MAX_QTY, product.stock ?? MAX_QTY);

// The name in lower case, with a hyphen between the words: "1 1/8\" Spacer" gives "1-1-8-spacer".
export const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// The material, the bonding method (when the product has one) and the finish, as the bag and the shop show them.
export const specOf = (p: Product) => [p.mat, p.bond, p.fin].filter(Boolean).join(" · ");

export const productBySlug = (products: readonly Product[], slug: string) => products.find((p) => p.slug === slug);

export const productByName = (products: readonly Product[], name: string) => products.find((p) => p.name === name);

// The "From £n" label for a category, from the lowest price. It is empty when the category has no product.
export function fromLabel(products: readonly Product[], cat: Category): string {
  const prices = products.filter((p) => p.cat === cat).map((p) => p.price);
  return prices.length ? `From £${Math.min(...prices)}` : "";
}
