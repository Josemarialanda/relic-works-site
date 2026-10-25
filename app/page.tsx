import { HeroCarousel } from "@/components/HeroCarousel";
import { Photo } from "@/components/Photo";
import { fromLabel } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-server";
import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import styles from "./page.module.css";

const PROMISES = [
  { title: "Made in the UK", body: "Every part leaves one workshop." },
  { title: "Built to last forever", body: "Lifetime guarantee on every part." },
  { title: "Ships in 5 days", body: "Free UK delivery over £100." },
];

const CATEGORIES = [
  { name: "Stems", image: "/images/home/category-stems.jpg" },
  { name: "Spacers", image: "/images/home/category-spacers.jpg" },
  { name: "Caps", image: "/images/home/category-caps.jpg" },
];

export default async function HomePage() {
  const { products } = await getCatalog();
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
              <Photo src={c.image} alt="" sizes="(max-width: 767px) 100vw, 33vw" quality={90} />
            </div>
            <div className={cx(layout.cell, layout.between)}>
              <span className="subheading">{c.name}</span>
              <span className="meta">{fromLabel(products, c.name)}</span>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
