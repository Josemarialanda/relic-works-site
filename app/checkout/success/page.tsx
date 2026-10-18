import type { Metadata } from "next";
import Link from "next/link";
import { ClearBag } from "@/components/ClearBag";
import button from "@/components/ui/button.module.css";
import { cx } from "@/lib/cx";
import { getStripe } from "@/lib/stripe";
import layout from "@/styles/layout.module.css";
import styles from "./success.module.css";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

// The customer email of a paid session, or null if the session is not paid or cannot be read.
async function paidEmail(sessionId: string): Promise<{ email: string | null } | null> {
  const stripe = getStripe();
  if (!stripe) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session.payment_status === "paid" ? { email: session.customer_details?.email ?? null } : null;
  } catch (err) {
    console.error("Could not read the Stripe Checkout session", err);
    return null;
  }
}

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { session_id } = await searchParams;
  // Stripe sends the customer here with the session in the address. Check it with Stripe, so a made-up
  // address cannot show a paid order or empty the bag.
  const paid = typeof session_id === "string" ? await paidEmail(session_id) : null;

  return (
    <main className={layout.ruleB}>
      <div className={layout.sectionHead}>
        <h1 className="heading">{paid ? "Thank you." : "Order"}</h1>
      </div>
      <div className={cx(layout.stack, layout.gap20, styles.body)}>
        {paid ? (
          <>
            <ClearBag />
            <p className={cx("subheading", styles.lead)}>Your order is paid.</p>
            <p className={cx("body-copy", styles.lead)}>
              {paid.email ? `We sent the receipt to ${paid.email}. ` : "Stripe sent you a receipt. "}
              Catalogue parts ship within 5 working days. Bespoke parts are made to order and ship in 3–4 weeks.
            </p>
          </>
        ) : (
          <>
            <p className={cx("subheading", styles.lead)}>We could not confirm a payment.</p>
            <p className={cx("body-copy", styles.lead)}>
              If you paid, Stripe sent you a receipt by email, and your order is safe. If you did not pay, your bag is still here.
            </p>
          </>
        )}
        <div className={styles.actions}>
          <Link className={cx(button.button, button.compact)} href="/shop">
            Shop parts
          </Link>
          <Link className={cx(button.button, button.outline)} href={paid ? "/" : "/bag"}>
            {paid ? "Back to home" : "Back to the bag"}
          </Link>
        </div>
      </div>
    </main>
  );
}
