import type { Metadata } from "next";
import { Fragment } from "react";
import { SupportNav } from "@/components/SupportNav";
import { cx } from "@/lib/cx";
import { gbp } from "@/lib/money";
import { ZONES } from "@/lib/shipping";
import layout from "@/styles/layout.module.css";
import styles from "./support.module.css";

export const metadata: Metadata = { title: "Support" };

const EMAIL = "hello@relicworks.co.uk";

// The same zones and prices as the bag and the checkout.
const RATES = ZONES.map((z) => ({ region: z.label, price: gbp(z.price), note: z.note }));

function DefRows({ rows, className }: { rows: [string, React.ReactNode][]; className?: string }) {
  return (
    <div className={cx(styles.defRows, className)}>
      {rows.map(([term, def]) => (
        <Fragment key={term}>
          <span className="meta-b">{term}</span>
          <div className="body-copy">{def}</div>
        </Fragment>
      ))}
    </div>
  );
}

function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <div className={layout.sectionHead}>
      <h2 className="heading">{title}</h2>
      <span className="meta">{note}</span>
    </div>
  );
}

export default function SupportPage() {
  return (
    <div className={layout.withSidebar}>
      <aside className={layout.ruleR}>
        <div className={cx(layout.sticky, layout.stack)}>
          <SupportNav />
          <div className={cx(layout.stack, layout.gap8, styles.contact)}>
            <span className="meta-b">Still stuck?</span>
            <a className={styles.email} href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
            <span className="meta muted">Replies within 1 working day</span>
          </div>
        </div>
      </aside>

      <main className={layout.stack}>
        <section id="shipping" className={layout.ruleB}>
          <SectionHead title="Shipping" note="Dispatched from the UK" />
          <div className={cx(layout.grid3, layout.ruleB)}>
            {RATES.map((r, i) => (
              <div key={r.region} className={cx(layout.cell, layout.stack, layout.gap8, i < 2 && layout.ruleR)}>
                <span className="meta-b">{r.region}</span>
                <span className="subheading">{r.price}</span>
                <span className="body-copy">{r.note}</span>
              </div>
            ))}
          </div>
          <DefRows
            rows={[
              ["Catalogue parts", "Dispatched within 5 working days."],
              ["Bespoke parts", "Made to order and dispatched in 3–4 weeks. We'll email when yours goes on the machine."],
              ["Tracking", "Every order is tracked. You'll get a link as soon as it ships."],
            ]}
          />
        </section>

        <section id="returns" className={layout.ruleB}>
          <SectionHead title="Returns" note="14 days" />
          <div className={cx(styles.notice, layout.ruleB)}>
            <span className={cx("meta-b", styles.noticeLabel)}>Please note</span>
            <span className="body-copy">
              We don&apos;t accept returns on bespoke parts. Each one is machined and finished to your spec, so it can&apos;t be resold. Bespoke
              parts are still covered by our lifetime guarantee.
            </span>
          </div>
          <DefRows
            rows={[
              ["Catalogue parts", "Return unused parts in their original packaging within 30 days for a full refund."],
              ["Bespoke parts", "Made for you, so they can't be returned unless faulty."],
              [
                "How to return",
                <div key="steps" className={cx(layout.stack, layout.gap12)}>
                  <span>1. Email your order number to {EMAIL}.</span>
                  <span>2. We send a prepaid label (UK) or return address.</span>
                  <span>3. Refunds land within 5 working days of the part arriving back.</span>
                </div>,
              ],
            ]}
          />
        </section>

        <section id="guarantee">
          <SectionHead title="Guarantee" note="Lifetime" />
          <div className={cx(layout.cell, layout.ruleB)}>
            <p className={cx("subheading", styles.pledge)}>Built to last forever. If a part fails through a fault of ours, we&apos;ll replace it.</p>
          </div>
          <div className={layout.grid2}>
            <div className={cx(layout.cell, layout.stack, layout.gap12, layout.ruleR)}>
              <span className="meta-b">Covered</span>
              <span className="body-copy">Material and machining defects, for life</span>
              <span className="body-copy">Braze and weld failures, for life</span>
              <span className="body-copy">Finish defects, for 2 years</span>
            </div>
            <div className={cx(layout.cell, layout.stack, layout.gap12)}>
              <span className="meta-b">Not covered</span>
              <span className="body-copy">Crash or impact damage</span>
              <span className="body-copy">Incorrect installation or torque</span>
              <span className="body-copy">Normal wear and patina on raw finishes</span>
            </div>
          </div>
          <DefRows
            className={layout.ruleT}
            rows={[["Making a claim", `Email photos and your order number to ${EMAIL}. The guarantee applies to the original owner.`]]}
          />
        </section>
      </main>
    </div>
  );
}
