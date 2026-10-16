"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import styles from "./NewsRotator.module.css";
import dots from "./ui/dots.module.css";

const NEWS = [
  { tag: "New stem", title: "The Relic Quill.", body: "A fillet-brazed quill stem for threaded builds. 80–120 mm extension, in raw, polished or painted.", link: "Shop the Quill", href: "/shop#Stems" },
  { tag: "New cap", title: "Hammered Ti cap.", body: "Each titanium top cap is hand-hammered before finishing, so no two are the same.", link: "Shop caps", href: "/shop#Caps" },
];

const INTERVAL_MS = 6000;

export function NewsRotator() {
  const [cur, setCur] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCur((c) => (c + 1) % NEWS.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  const item = NEWS[cur];

  return (
    <div className={styles.news}>
      <span className="meta-b">News — {item.tag}</span>
      <span className="display">{item.title}</span>
      <p className={cx("body-copy", styles.body)}>{item.body}</p>
      <a className="link-u" href={item.href}>
        {item.link}
      </a>
      <div className={cx(dots.dots, styles.dots)}>
        {NEWS.map((n, i) => (
          <button
            key={n.title}
            type="button"
            title={n.title}
            className={cx(dots.dot, i === cur && dots.on)}
            onClick={() => {
              setCur(i);
              setTick((t) => t + 1);
            }}
          />
        ))}
      </div>
    </div>
  );
}
