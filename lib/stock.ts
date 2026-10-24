// The stock count of a product is the metadata `stock` of its Stripe product (a whole number). A product with no
// `stock` has no limit. The Stripe webhook (app/api/stripe-webhook) lowers the count after each paid order.
// The metadata `stock_orders` keeps the end of the id of the last orders that were counted, so that an order that
// Stripe sends two times lowers the count only one time.

const MAX_MARKS = 30;
const MARK_LENGTH = 12;

export type StockUpdate = { stock: string; stock_orders: string };

// The new metadata after a sale of `qty` items in the order `sessionId`. It is null when nothing must change:
// the product has no stock count, or the order is already counted.
export function applySale(metadata: Record<string, string>, qty: number, sessionId: string): StockUpdate | null {
  if (metadata.stock === undefined || !/^\d+$/.test(metadata.stock)) return null;
  const mark = sessionId.slice(-MARK_LENGTH);
  const marks = (metadata.stock_orders ?? "").split(",").filter(Boolean);
  if (marks.includes(mark)) return null;
  return { stock: String(Math.max(0, Number(metadata.stock) - qty)), stock_orders: [...marks, mark].slice(-MAX_MARKS).join(",") };
}
