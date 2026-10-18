import type Stripe from "stripe";
import { buildOrder } from "@/lib/checkout";
import { getStripe } from "@/lib/stripe";

// A real order is far smaller than this.
const MAX_BODY = 50_000;

// Start a payment. The body has the delivery zone and the items (names, quantities and bespoke
// options, with no prices). The answer has the address of the Stripe payment page.
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY) return Response.json({ error: "The order is too large." }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "The order is not valid." }, { status: 400 });
  }

  const result = buildOrder(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  const { zone, lines, subtotal, shipping } = result.order;

  const stripe = getStripe();
  if (!stripe) return Response.json({ error: "Checkout is not available yet." }, { status: 503 });

  const origin = new URL(request.url).origin;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: "gbp",
          unit_amount: l.unitAmount,
          product_data: {
            name: l.name,
            description: l.description,
            // The order page in the Stripe dashboard shows these options, so you can make the part.
            ...(l.bespoke && { metadata: { bespoke: JSON.stringify(l.bespoke) } }),
          },
        },
      })),
      shipping_address_collection: { allowed_countries: zone.countries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: shipping === 0 ? `${zone.label} delivery (free)` : `${zone.label} delivery`,
            fixed_amount: { amount: shipping * 100, currency: "gbp" },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      metadata: { zone: zone.id, subtotal: String(subtotal) },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/bag`,
    });
    if (!session.url) throw new Error("Stripe sent no payment page address");
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Could not create the Stripe Checkout session", err);
    return Response.json({ error: "We could not start the payment. Try again in a moment." }, { status: 502 });
  }
}
