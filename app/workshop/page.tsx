import type { Metadata } from "next";
import Link from "next/link";
import { Collage } from "@/components/Collage";
import { Placeholder } from "@/components/Placeholder";
import button from "@/components/ui/button.module.css";
import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import styles from "./workshop.module.css";

export const metadata: Metadata = { title: "Workshop" };

const STEPS = [
  { num: "01", name: "Turned", body: "Bar stock is turned on the lathe into steerer clamps, caps and spacers." },
  { num: "02", name: "Milled", body: "Bodies and faceplates are CNC milled, then brazed or welded by hand." },
  { num: "03", name: "Finished", body: "Every part is finished and checked in-house before it ships." },
];

const MATERIALS = [
  { name: "CNC aluminium", note: "Light, stiff, anodizes well" },
  { name: "Titanium", note: "Corrosion-proof, ages beautifully" },
  { name: "Steel", note: "Brazed, tough, repairable" },
];

const FINISHES = [
  { name: "Raw", note: "Bare metal, waxed" },
  { name: "Brushed", note: "Satin grain, low sheen" },
  { name: "Painted", note: "Any colour" },
  { name: "Polished", note: "Mirror finish" },
];

const COLLAGE = [
  { alt: "Raw brazed stem", col: "span 2", row: "span 2" },
  { alt: "Window cruiser bar" },
  { alt: "Hammered stem cap" },
  { alt: "Stem cap set", col: "span 2" },
  { alt: "Gloss black brazed stem", col: "span 2" },
  { alt: "Brass short stem", col: "span 2" },
];

function NoteList({ title, items }: { title: string; items: { name: string; note: string }[] }) {
  return (
    <div className={cx(layout.stack, layout.gap20, styles.noteList)}>
      <span className="meta-b">{title}</span>
      <div className={layout.stack}>
        {items.map((m) => (
          <div key={m.name} className={cx(layout.between, layout.ruleT, styles.noteRow)}>
            <span className="subheading">{m.name}</span>
            <span className={cx("meta", styles.noteText)}>{m.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WorkshopPage() {
  return (
    <main>
      <section className={styles.hero}>
        <Placeholder label="Raw brazed stem held in the workshop" fill />
        <span className={cx("meta-b", styles.heroKicker)}>Turned, milled and finished in the UK</span>
        <div className={cx("poster", styles.heroPoster)}>The workshop.</div>
      </section>

      <section className={cx(layout.split57, layout.ruleB)}>
        <div className={cx(layout.ruleR, styles.storyLabel)}>
          <span className="meta-b">Our story</span>
        </div>
        <div className={cx(layout.stack, layout.gap20, styles.story)}>
          <h2 className={cx("heading", styles.storyHeading)}>A passion for riding and a workshop to build cool parts.</h2>
          <p className={cx("body-copy", styles.storyBody)}>
            That&apos;s how Relic Works started. Everything is turned, milled and finished right here in the UK. No outsourcing, no
            middlemen. Just tough, high-quality stems, caps and custom bits designed for funky builds and built to last forever.
          </p>
        </div>
      </section>

      <section className={cx(layout.grid3, layout.ruleB)}>
        {STEPS.map((s, i) => (
          <div key={s.name} className={cx(layout.stack, i < 2 && layout.ruleR)}>
            <div className={layout.ratio43}>
              <Placeholder label={s.name} />
            </div>
            <div className={cx(layout.cell, layout.stack, layout.gap8)}>
              <div className={layout.between}>
                <span className="subheading">{s.name}</span>
                <span className="meta">{s.num}</span>
              </div>
              <p className="body-copy muted">{s.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className={cx(layout.grid2, layout.ruleB)}>
        <div className={layout.ruleR}>
          <NoteList title="Materials" items={MATERIALS} />
        </div>
        <NoteList title="Finishes" items={FINISHES} />
      </section>

      <div className={layout.sectionHead}>
        <span className="subheading">From the bench</span>
        <span className="meta">Click to enlarge</span>
      </div>
      <Collage tiles={COLLAGE} columns={4} rowHeight={240} className={layout.ruleB} />

      <section className={cx(layout.grid2, layout.ruleB)}>
        <div className={cx(layout.stack, layout.gap12, layout.ruleR, styles.cta)}>
          <span className="meta-b">Made for you</span>
          <span className="heading">Want something one-off?</span>
        </div>
        <div className={cx(layout.stack, layout.gap20, styles.ctaBody)}>
          <p className="body-copy">Pick your dimensions and finish. We&apos;ll machine it to order.</p>
          <div className={styles.ctaButtons}>
            <Link className={cx(button.button, button.compact)} href="/bespoke">
              Build yours
            </Link>
            <Link className={cx(button.button, button.outline)} href="/shop">
              Shop the catalog
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
