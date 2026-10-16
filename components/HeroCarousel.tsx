"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import styles from "./HeroCarousel.module.css";
import { Placeholder } from "./Placeholder";
import button from "./ui/button.module.css";
import dots from "./ui/dots.module.css";

const SLIDES = [
  { name: "Stems", kicker: "Stems — turned, milled and finished in the UK", meta: "Steel · Titanium · Aluminium · From £165", cta: "Shop stems", placeholder: "Photo to come" },
  { name: "Spacers", kicker: "Spacers", meta: "Machined stacks in every finish · From £24", cta: "Shop spacers", placeholder: "Spacer photo to come" },
  { name: "Caps", kicker: "Caps", meta: "Hammered, painted or polished · From £32", cta: "Shop caps", placeholder: "Photo to come" },
];

const INTERVAL_MS = 5000;

export function HeroCarousel() {
  const [cur, setCur] = useState(0);
  // A new value restarts the timer after a manual pick.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCur((c) => (c + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  const go = useCallback((i: number) => {
    setCur(i);
    setTick((t) => t + 1);
  }, []);

  const slide = SLIDES[cur];

  return (
    <section className={styles.hero}>
      {SLIDES.map((s, i) => (
        <div key={s.name} className={styles.slide} style={{ opacity: i === cur ? 1 : 0 }}>
          <Placeholder label={s.placeholder} />
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
          {slide.cta}
        </a>
        <Link className={cx(button.button, button.outline)} href="/bespoke">
          Configure your own
        </Link>
      </div>
      <div className={cx("poster", styles.poster)}>Relic Works</div>
    </section>
  );
}
