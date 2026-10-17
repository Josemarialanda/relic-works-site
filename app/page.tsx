import Link from "next/link";
import { Collage } from "@/components/Collage";
import { HeroCarousel } from "@/components/HeroCarousel";
import { NewsletterForm } from "@/components/NewsletterForm";
import { NewsRotator } from "@/components/NewsRotator";
import { Photo } from "@/components/Photo";
import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import styles from "./page.module.css";

const PROMISES = [
  { title: "Made in the UK", body: "Every part leaves one workshop." },
  { title: "Built to last forever", body: "Lifetime guarantee on every part." },
  { title: "Ships in 5 days", body: "Free UK delivery over £100." },
];

const CATEGORIES = [
  { name: "Stems", meta: "From £165", image: "/images/home/category-stems.svg" },
  { name: "Spacers", meta: "From £24", image: "/images/home/category-spacers.svg" },
  { name: "Caps", meta: "From £32", image: "/images/home/category-caps.svg" },
];

const COLLAGE = [
  { alt: "Raw brazed stem", src: "/images/home/collage-raw-brazed-stem.svg", col: "span 2", row: "span 2" },
  { alt: "Hammered stem cap", src: "/images/home/collage-hammered-stem-cap.svg" },
  { alt: "Stem cap set", src: "/images/home/collage-stem-cap-set.svg" },
  { alt: "Gloss black brazed stem", src: "/images/home/collage-gloss-black-brazed-stem.svg" },
  { alt: "Window cruiser bar", src: "/images/home/collage-window-cruiser-bar.svg" },
  { alt: "Brass short stem", src: "/images/home/collage-brass-short-stem.svg" },
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
              {/* The category name is the link text, so the photo has no alt text. */}
              <Photo src={c.image} alt="" sizes="(max-width: 767px) 100vw, 33vw" />
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
            <Photo src="/images/home/news.svg" alt="Parts on the workshop bench" sizes="(max-width: 767px) 100vw, 50vw" fill />
          </div>
          <NewsletterForm />
        </div>
      </section>
    </main>
  );
}
