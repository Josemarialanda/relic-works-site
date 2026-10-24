import { revalidateTag } from "next/cache";
import type Stripe from "stripe";
import { applySale } from "@/lib/stock";
import { getStripe } from "@/lib/stripe";

// Stripe calls this route after a payment. The route lowers the stock count of each product in the order.
// Set it up in the Stripe dashboard (Developers → Webhooks) for the events checkout.session.completed and
// checkout.session.async_payment_succeeded, and put the signing secret in STRIPE_WEBHOOK_SECRET.
// A product with no `stock` metadata is not changed. See data/README.md.

// Lower the stock of each product in a paid order. It gives the number of products that it changed.
async function countSale(stripe: Stripe, sessionId: string): Promise<number> {
  const quantities = new Map<string, number>();
  for await (const line of stripe.checkout.sessions.listLineItems(sessionId, { limit: 100 })) {
    const product = line.price?.product;
    if (!product) continue;
    const id = typeof product === "string" ? product : product.id;
    quantities.set(id, (quantities.get(id) ?? 0) + (line.quantity ?? 0));
  }

  let changed = 0;
  for (const [id, qty] of quantities) {
    // Read the product again, so the count is the newest one.
    const product = await stripe.products.retrieve(id);
    const update = applySale(product.metadata, qty, sessionId);
    if (!update) continue;
    await stripe.products.update(id, { metadata: update });
    changed++;
  }
  return changed;
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();
  if (!secret || !stripe) return Response.json({ error: "The webhook is not set up." }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "The signature is missing." }, { status: 400 });

  let event: Stripe.Event;
  try {
    // The signature is for the exact text of the body, so read the text, not the JSON.
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: "The signature is not valid." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return Response.json({ received: true });
  }
  const session = event.data.object;
  // A payment that comes later (for example a bank debit) is counted when it succeeds.
  if (session.payment_status !== "paid") return Response.json({ received: true });

  try {
    if ((await countSale(stripe, session.id)) > 0) revalidateTag("catalog", { expire: 0 });
  } catch (err) {
    console.error("Could not lower the stock count", err);
    // Stripe sends the event again after an error status.
    return Response.json({ error: "Could not lower the stock count." }, { status: 500 });
  }
  return Response.json({ received: true });
}
