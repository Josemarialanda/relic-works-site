import type { Metadata } from "next";
import Link from "next/link";
import { Collage } from "@/components/Collage";
import { Photo } from "@/components/Photo";
import button from "@/components/ui/button.module.css";
import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import styles from "./workshop.module.css";

export const metadata: Metadata = { title: "Workshop" };

const STEPS = [
  { num: "01", name: "Turned", image: "/images/workshop/process-turned.jpg", body: "Bar stock is turned on the lathe into steerer clamps, caps and spacers." },
  { num: "02", name: "Milled", image: "/images/workshop/process-milled.jpg", body: "Bodies and faceplates are CNC milled, then brazed or welded by hand." },
  { num: "03", name: "Finished", image: "/images/workshop/process-finished.jpg", body: "Every part is finished and checked in-house before it ships." },
];

const MATERIALS = [
  { name: "Titanium", note: "Corrosion-proof, ages beautifully" },
  { name: "Steel", note: "Brazed, tough, repairable" },
];

const FINISHES = [
  { name: "Brushed", note: "Satin grain, low sheen" },
  { name: "Polished", note: "Mirror finish" },
];

const COLLAGE = [
  { alt: "Quill Stem", src: "/images/workshop/collage-quill-stem.jpg", col: "span 2", row: "span 2" },
  { alt: "Threadless Stem", src: "/images/workshop/collage-threadless-stem.jpg" },
  { alt: "Flat Cap", src: "/images/workshop/collage-flat-cap.jpg" },
  { alt: "Spacer Cap", src: "/images/workshop/collage-spacer-cap.jpg", col: "span 2" },
  { alt: `1 1/8" Spacer`, src: "/images/workshop/collage-spacer-1-1-8in.jpg", col: "span 2" },
  { alt: `1" Spacer`, src: "/images/workshop/collage-spacer-1in.jpg", col: "span 2" },
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
        <Photo src="/images/workshop/hero.jpg" alt="Quill Stem held in the workshop" preload fill />
        <span className={cx("meta-b", styles.heroKicker)}>Turned, milled and finished in the UK</span>
        <div className={cx("poster", styles.heroPoster)}>The Workshop</div>
      </section>

      <section className={cx(layout.grid3, layout.ruleB)}>
        {STEPS.map((s, i) => (
          <div key={s.name} className={cx(layout.stack, i < 2 && layout.ruleR)}>
            <div className={layout.ratio43}>
              {/* The step name is the heading below, so the photo has no alt text. */}
              <Photo src={s.image} alt="" sizes="(max-width: 767px) 100vw, 33vw" />
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
