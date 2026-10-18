import Stripe from "stripe";

let client: Stripe | undefined;

// The Stripe client, or null when STRIPE_SECRET_KEY is not set (the checkout is then not available).
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return (client ??= new Stripe(key));
}
