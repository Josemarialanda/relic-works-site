"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { bagCount, gbp, setBag, useBag, type BagItem } from "@/lib/bag";
import { MAX_QTY } from "@/lib/catalog";
import { cx } from "@/lib/cx";
import { shippingCost, zoneById, ZONES, type ZoneId } from "@/lib/shipping";
import layout from "@/styles/layout.module.css";
import styles from "./Bag.module.css";
import { Photo } from "./Photo";
import { Placeholder } from "./Placeholder";
import button from "./ui/button.module.css";

export function Bag() {
  const items = useBag();
  const zoneSelectId = useId();
  const [zoneId, setZoneId] = useState<ZoneId>("uk");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The browser can show this page again from its cache after the customer comes back from the payment page.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => e.persisted && setPaying(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const update = (key: string, fn: (i: BagItem) => BagItem) =>
    setBag(items.map((i) => (i.key === key ? fn(i) : i)).filter((i) => i.qty > 0));

  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const zone = zoneById(zoneId)!;
  const shipping = shippingCost(zone, subtotal);
  const count = bagCount(items);
  const empty = items.length === 0;
  const hasBespoke = items.some((i) => i.bespoke);

  // Send only names, quantities and bespoke options. The server prices the order, so no price goes out.
  async function checkout() {
    if (paying) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ zone: zoneId, items: items.map((i) => (i.bespoke ? { bespoke: i.bespoke, qty: i.qty } : { name: i.name, qty: i.qty })) }),
      });
      const data: { url?: string; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "We could not start the payment. Try again in a moment.");
      // Stay in the paying state while the browser goes to the payment page.
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not start the payment. Try again in a moment.");
      setPaying(false);
    }
  }

  return (
    <div className={cx(styles.bag, layout.ruleB)}>
      <main className={cx(layout.stack, layout.ruleR)}>
        <div className={layout.sectionHead}>
          <h1 className="heading">Bag</h1>
          <span className="meta">{count} items</span>
        </div>

        {items.map((it) => (
          <div key={it.key} className={cx(styles.item, layout.ruleB)}>
            <div className={layout.ratio11}>
              {/* Items saved before the bag had images have no image. */}
              {it.image ? <Photo src={it.image} alt={it.name} sizes="160px" /> : <Placeholder label={it.name} />}
            </div>
            <div className={cx(layout.stack, layout.gap8)}>
              <span className="meta muted">{it.type}</span>
              <span className={styles.itemName}>{it.name}</span>
              <span className={cx("meta", styles.itemSpec)}>{it.spec}</span>
              <div className={styles.itemActions}>
                <div className={styles.qty}>
                  <button type="button" aria-label={`Remove one ${it.name}`} onClick={() => update(it.key, (x) => ({ ...x, qty: x.qty - 1 }))}>
                    −
                  </button>
                  <span className={styles.qtyValue}>{it.qty}</span>
                  <button type="button" aria-label={`Add one ${it.name}`} disabled={it.qty >= MAX_QTY} onClick={() => update(it.key, (x) => ({ ...x, qty: x.qty + 1 }))}>
                    +
                  </button>
                </div>
                <button type="button" className={button.text} onClick={() => update(it.key, (x) => ({ ...x, qty: 0 }))}>
                  Remove
                </button>
              </div>
            </div>
            <span>{gbp(it.price * it.qty)}</span>
          </div>
        ))}

        {empty && (
          <div className={cx(layout.stack, layout.gap20, styles.empty)}>
            <span className="subheading">Your bag is empty.</span>
            <div className={styles.emptyActions}>
              <Link className={cx(button.button, button.compact)} href="/shop">
                Shop parts
              </Link>
              <Link className={cx(button.button, button.outline)} href="/bespoke">
                Configure your own
              </Link>
            </div>
          </div>
        )}
      </main>

      <aside>
        <div className={cx(layout.sticky, layout.stack)}>
          <div className={cx(layout.ruleB, styles.summaryHead)}>
            <span className="meta-b">Summary</span>
          </div>
          <div className={cx(layout.cell, layout.stack, layout.gap12, layout.ruleB)}>
            <div className={layout.between}>
              <span>Subtotal</span>
              <span>{gbp(subtotal)}</span>
            </div>
            <div className={styles.zone}>
              <label className="meta-b" htmlFor={zoneSelectId}>
                Deliver to
              </label>
              <select id={zoneSelectId} className={styles.zoneSelect} value={zoneId} onChange={(e) => setZoneId(e.target.value as ZoneId)}>
                {ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={layout.between}>
              <span>{zone.label} shipping</span>
              <span>{shipping === 0 ? "Free" : gbp(shipping)}</span>
            </div>
            <span className="meta muted">
              {zone.freeFrom === undefined
                ? zone.note
                : subtotal >= zone.freeFrom
                  ? "Free UK delivery applied"
                  : `Spend ${gbp(Math.max(0, zone.freeFrom - subtotal))} more for free UK delivery`}
            </span>
          </div>
          <div className={cx(layout.cell, layout.between, layout.ruleB)}>
            <span className={styles.totalLabel}>Total</span>
            <span className="subheading">{gbp(subtotal + shipping)}</span>
          </div>
          <div className={cx(layout.cell, layout.stack, layout.gap12)}>
            <button type="button" className={cx(button.button, button.block)} disabled={empty || paying} onClick={checkout}>
              {paying ? "Opening payment…" : "Checkout"}
            </button>
            {error && (
              <span className="meta" role="alert">
                {error}
              </span>
            )}
            <span className={cx("meta muted", styles.leadTime)}>
              {hasBespoke
                ? "Bespoke parts are made to order and ship in 3–4 weeks. Catalogue parts ship with them."
                : "Catalogue parts ship within 5 working days."}
            </span>
            <a className="link-u" href="/support#shipping">
              Shipping &amp; returns
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
