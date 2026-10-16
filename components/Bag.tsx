"use client";

import Link from "next/link";
import { bagCount, gbp, setBag, useBag, type BagItem } from "@/lib/bag";
import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import styles from "./Bag.module.css";
import { Placeholder } from "./Placeholder";
import button from "./ui/button.module.css";

const FREE_SHIPPING_FROM = 100;
const UK_SHIPPING = 6;

export function Bag() {
  const items = useBag();

  const update = (key: string, fn: (i: BagItem) => BagItem) =>
    setBag(items.map((i) => (i.key === key ? fn(i) : i)).filter((i) => i.qty > 0));

  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : UK_SHIPPING;
  const count = bagCount(items);
  const empty = items.length === 0;
  const hasBespoke = items.some((i) => i.bespoke);

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
              <Placeholder label={it.name} />
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
                  <button type="button" aria-label={`Add one ${it.name}`} onClick={() => update(it.key, (x) => ({ ...x, qty: x.qty + 1 }))}>
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
            <div className={layout.between}>
              <span>UK shipping</span>
              <span>{shipping === 0 ? "Free" : gbp(shipping)}</span>
            </div>
            <span className="meta muted">
              {subtotal >= FREE_SHIPPING_FROM
                ? "Free UK delivery applied"
                : `Spend ${gbp(Math.max(0, FREE_SHIPPING_FROM - subtotal))} more for free UK delivery`}
            </span>
          </div>
          <div className={cx(layout.cell, layout.between, layout.ruleB)}>
            <span className={styles.totalLabel}>Total</span>
            <span className="subheading">{gbp(subtotal + shipping)}</span>
          </div>
          <div className={cx(layout.cell, layout.stack, layout.gap12)}>
            {/* TODO: connect checkout to a payment provider. */}
            <button type="button" className={cx(button.button, button.block)} disabled={empty}>
              Checkout
            </button>
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
