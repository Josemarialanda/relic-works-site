"use client";

import { getImageProps } from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type Category, fromLabel, type Product } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalog-context";
import { cx } from "@/lib/cx";
import { useSwipe } from "@/lib/useSwipe";
import styles from "./HeroCarousel.module.css";
import dots from "./ui/dots.module.css";

// Each slide has a wide drawing (tablet and desktop) and a tall drawing (a phone below 600 px), with the same parts.
// "description" tells what the drawing shows. "label" is the name of the link that covers the slide. The shop links
// use the hash to select the category.
// A category with no product in the catalog has no price, so the line has no separator then.
const madeIn = (products: Product[], cat: Category) => ["Made in the UK", fromLabel(products, cat)].filter(Boolean).join(" · ");

const slidesFor = (products: Product[]) => [
  { name: "Stems", description: "Quill and threadless, in brazed steel or welded titanium", meta: madeIn(products, "Stems"), label: "Shop stems", href: "/shop#Stems", image: "hero-stems", alt: "A drawing of two quill stems and two threadless stems, in steel and titanium" },
  { name: "Spacers", description: `Steel and titanium, 5 to 20 mm, for 1" and 1 1/8" steerers`, meta: madeIn(products, "Spacers"), label: "Shop spacers", href: "/shop#Spacers", image: "hero-spacers", alt: "A drawing of six spacers in different sizes and finishes" },
  { name: "Caps", description: "Flat caps and spacer caps, in polished steel or brushed titanium", meta: madeIn(products, "Caps"), label: "Shop caps", href: "/shop#Caps", image: "hero-caps", alt: "A drawing of two flat caps and two spacer caps" },
  { name: "Bespoke", description: "Stems, spacers and caps, made to your sizes and finish", meta: "Configure your own", label: "Configure your own", href: "/bespoke", image: "hero-bespoke", alt: "A drawing of a stem, a spacer cap and a spacer, with dimension lines" },
];

// The tall drawing is for a window below 600 px wide. The wide drawing crops well from 600 px up.
const TALL = "(max-width: 599px)";

// A <picture> with the two drawings. The first slide shows at load, so it loads first.
function HeroPicture({ image, alt, first }: { image: string; alt: string; first: boolean }) {
  const common = { alt, sizes: "100vw", quality: 90, fetchPriority: first ? ("high" as const) : undefined, loading: first ? ("eager" as const) : undefined };
  const { props: { srcSet: tall } } = getImageProps({ ...common, src: `/images/home/${image}-tall.jpg`, width: 1200, height: 1500 });
  const { props: { srcSet: wide, ...rest } } = getImageProps({ ...common, src: `/images/home/${image}.jpg`, width: 2752, height: 1536 });
  return (
    <picture>
      <source media={TALL} srcSet={tall} />
      <img {...rest} srcSet={wide} className={styles.image} alt={alt} />
    </picture>
  );
}

const INTERVAL_MS = 5000;

export function HeroCarousel() {
  const { products } = useCatalog();
  const SLIDES = useMemo(() => slidesFor(products), [products]);
  const [cur, setCur] = useState(0);
  // A new value restarts the timer after a manual pick.
  const [tick, setTick] = useState(0);

  const go = useCallback((i: number) => {
    setCur(i);
    setTick((t) => t + 1);
  }, []);

  const swipe = useSwipe((d) => {
    if (d === "left") go((cur + 1) % SLIDES.length);
    if (d === "right") go((cur - 1 + SLIDES.length) % SLIDES.length);
  });

  // No autoplay while a finger is on the slide.
  useEffect(() => {
    if (swipe.active) return;
    const id = setInterval(() => setCur((c) => (c + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick, swipe.active]);

  const slide = SLIDES[cur];

  return (
    <section className={styles.hero} {...swipe.handlers}>
      {SLIDES.map((s, i) => (
        <div key={s.name} className={styles.slide} style={{ opacity: i === cur ? 1 : 0 }}>
          <HeroPicture image={s.image} alt={s.alt} first={i === 0} />
        </div>
      ))}
      {/* The link covers the full hero, so a click anywhere opens the page of the current slide. A swipe does not
          open it (useSwipe cancels the click). The dots are above the link. <a> and not <Link>, so the shop page gets
          a native hashchange event. */}
      <a className={styles.link} href={slide.href} aria-label={slide.label} />
      {/* The text is between the parts of the wide drawing, and above the parts of the tall drawing. */}
      <div className={styles.text}>
        <p className={styles.title}>{slide.name}</p>
        <p className={styles.description}>{slide.description}</p>
        <p className={cx("meta-b", styles.meta)}>{slide.meta}</p>
      </div>
      <div className={cx(dots.dots, styles.dots)}>
        {SLIDES.map((s, i) => (
          <button key={s.name} type="button" title={s.name} className={cx(dots.dot, i === cur && dots.on)} onClick={() => go(i)} />
        ))}
      </div>
    </section>
  );
}
