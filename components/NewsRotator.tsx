"use client";

import { useCallback, useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import { useSwipe } from "@/lib/useSwipe";
import styles from "./NewsRotator.module.css";
import dots from "./ui/dots.module.css";

const NEWS = [
  { tag: "New stem", title: "Quill Stem.", body: "A fillet-brazed quill stem for threaded builds. 80–120 mm extension, in raw, polished or painted.", link: "Shop stems", href: "/shop#Stems" },
  { tag: "New cap", title: "Spacer Cap.", body: "A titanium top cap with an integrated spacer, so your stack has one part less.", link: "Shop caps", href: "/shop#Caps" },
];

const INTERVAL_MS = 6000;

export function NewsRotator() {
  const [cur, setCur] = useState(0);
  const [tick, setTick] = useState(0);

  const go = useCallback((i: number) => {
    setCur(i);
    setTick((t) => t + 1);
  }, []);

  const swipe = useSwipe((d) => {
    if (d === "left") go((cur + 1) % NEWS.length);
    if (d === "right") go((cur - 1 + NEWS.length) % NEWS.length);
  });

  // No autoplay while a finger is on the item.
  useEffect(() => {
    if (swipe.active) return;
    const id = setInterval(() => setCur((c) => (c + 1) % NEWS.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick, swipe.active]);

  const item = NEWS[cur];

  return (
    <div className={styles.news} {...swipe.handlers}>
      <span className="meta-b">News — {item.tag}</span>
      <span className="display">{item.title}</span>
      <p className={cx("body-copy", styles.body)}>{item.body}</p>
      <a className="link-u" href={item.href}>
        {item.link}
      </a>
      <div className={cx(dots.dots, styles.dots)}>
        {NEWS.map((n, i) => (
          <button key={n.title} type="button" title={n.title} className={cx(dots.dot, i === cur && dots.on)} onClick={() => go(i)} />
        ))}
      </div>
    </div>
  );
}
