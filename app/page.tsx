import Link from "next/link";
import { Collage } from "@/components/Collage";
import { HeroCarousel } from "@/components/HeroCarousel";
import { NewsletterForm } from "@/components/NewsletterForm";
import { NewsRotator } from "@/components/NewsRotator";
import { Placeholder } from "@/components/Placeholder";
import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import styles from "./page.module.css";

const PROMISES = [
  { title: "Made in the UK", body: "Every part leaves one workshop." },
  { title: "Built to last forever", body: "Lifetime guarantee on every part." },
  { title: "Ships in 5 days", body: "Free UK delivery over £100." },
];

const CATEGORIES = [
  { name: "Stems", meta: "From £165", placeholder: "Photo to come" },
  { name: "Spacers", meta: "From £24", placeholder: "Spacer photo to come" },
  { name: "Caps", meta: "From £32", placeholder: "Photo to come" },
];

const COLLAGE = [
  { alt: "Raw brazed stem", col: "span 2", row: "span 2" },
  { alt: "Hammered stem cap" },
  { alt: "Stem cap set" },
  { alt: "Gloss black brazed stem" },
  { alt: "Window cruiser bar" },
  { alt: "Brass short stem" },
];

export default function HomePage() {
  return (
    <main>
      <HeroCarousel />

      <section className={cx(layout.grid3, layout.ruleB)}>
        {PROMISES.map((p, i) => (
          <div key={p.title} className={cx(layout.stack, layout.gap4, styles.promise, i < 2 && layout.ruleR)}>
            <span className="meta-b">{p.title}</span>
            <span>{p.body}</span>
          </div>
        ))}
      </section>

      <section className={cx(layout.grid3, layout.ruleB)}>
        {CATEGORIES.map((c, i) => (
          <a key={c.name} className={cx(layout.stack, i < 2 && layout.ruleR)} href={`/shop#${c.name}`}>
            <div className={layout.ratio43}>
              <Placeholder label={c.placeholder} />
            </div>
            <div className={cx(layout.cell, layout.between)}>
              <span className="subheading">{c.name}</span>
              <span className="meta">{c.meta}</span>
            </div>
          </a>
        ))}
      </section>

      <section className={cx(layout.split57, layout.ruleB)}>
        <div className={cx(layout.stack, layout.ruleR, styles.story)}>
          <div className={cx(layout.stack, layout.gap20)}>
            <span className="meta-b">The workshop</span>
            <h2 className="heading">A passion for riding and a workshop.</h2>
            <p className={cx("body-copy", styles.storyBody)}>
              That&apos;s how Relic started. Tough, high-quality stems, caps and custom bits for funky builds, built to last forever.
            </p>
          </div>
          <Link className={cx(layout.between, layout.ruleT, styles.storyLink)} href="/workshop">
            <span className="subheading">Visit the workshop</span>
            <span className="meta">Our story</span>
          </Link>
        </div>
        <Collage tiles={COLLAGE} columns={3} rowHeight={200} />
      </section>

      <section className={cx(layout.grid2, layout.ruleB)}>
        <NewsRotator />
        <div className={layout.stack}>
          <div className={cx(layout.ruleB, styles.newsPhoto)}>
            <Placeholder label="Photo to come" fill />
          </div>
          <NewsletterForm />
        </div>
      </section>
    </main>
  );
}
