"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fromPrice } from "@/lib/catalog";
import { cx } from "@/lib/cx";
import { useSwipe } from "@/lib/useSwipe";
import styles from "./HeroCarousel.module.css";
import { Photo } from "./Photo";
import button from "./ui/button.module.css";
import dots from "./ui/dots.module.css";

const SLIDES = [
  { name: "Stems", kicker: "Stems — turned, milled and finished in the UK", meta: `Quill and threadless · From £${fromPrice("Stems")}`, cta: "Shop stems", image: "/images/home/hero-stems.svg", alt: "A quill stem and a threadless stem" },
  { name: "Spacers", kicker: "Spacers", meta: `For 1" and 1 1/8" steerers · From £${fromPrice("Spacers")}`, cta: "Shop spacers", image: "/images/home/hero-spacers.svg", alt: "A stack of machined spacers" },
  { name: "Caps", kicker: "Caps", meta: `Flat caps and spacer caps · From £${fromPrice("Caps")}`, cta: "Shop caps", image: "/images/home/hero-caps.svg", alt: "A flat cap and a spacer cap" },
];

const INTERVAL_MS = 5000;

export function HeroCarousel() {
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
          {/* The first slide shows at load, so load it first. */}
          <Photo src={s.image} alt={s.alt} preload={i === 0} />
        </div>
      ))}
      <div className={cx("meta-b", styles.kicker)}>
        <span>{slide.kicker}</span>
        <span className={styles.kickerMeta}>{slide.meta}</span>
      </div>
      <div className={cx(dots.dots, styles.dots)}>
        {SLIDES.map((s, i) => (
          <button key={s.name} type="button" title={s.name} className={cx(dots.dot, i === cur && dots.on)} onClick={() => go(i)} />
        ))}
      </div>
      <div className={styles.ctas}>
        <a className={button.button} href={`/shop#${encodeURIComponent(slide.name)}`}>
          {/* All the labels share one cell, so the button is as wide as the longest label on every slide.
              Hidden labels are not part of the accessible name. */}
          <span className={styles.ctaLabels}>
            {SLIDES.map((s) => (
              <span key={s.name} className={s === slide ? undefined : styles.ctaHidden}>
                {s.cta}
              </span>
            ))}
          </span>
        </a>
        <Link className={cx(button.button, button.outline)} href="/bespoke">
          Configure your own
        </Link>
      </div>
      <div className={cx("poster", styles.poster)}>Relic Works</div>
    </section>
  );
}
