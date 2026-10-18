import { PRODUCTS, type Category } from "../data/products";

// The most of one item in an order. The bag and the checkout server both use it.
export const MAX_QTY = 20;

export const productByName = (name: string) => PRODUCTS.find((p) => p.name === name);
export const isProduct = (name: string) => productByName(name) !== undefined;

// The lowest price in a category, for the "From £n" labels.
export function fromPrice(cat: Category): number {
  return Math.min(...PRODUCTS.filter((p) => p.cat === cat).map((p) => p.price));
}
