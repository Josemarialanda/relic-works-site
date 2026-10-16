"use client";

import { useCallback, useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import styles from "./SupportNav.module.css";

const SECTIONS = [
  { id: "shipping", label: "Shipping" },
  { id: "returns", label: "Returns" },
  { id: "guarantee", label: "Guarantee" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function isSection(id: string): id is SectionId {
  return SECTIONS.some((s) => s.id === id);
}

export function SupportNav() {
  const [active, setActive] = useState<SectionId>("shipping");

  const scrollTo = useCallback((id: SectionId) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: "smooth" });
    setActive(id);
  }, []);

  useEffect(() => {
    const readHash = () => {
      const id = window.location.hash.slice(1);
      if (isSection(id)) scrollTo(id);
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [scrollTo]);

  return (
    <div className={cx(layout.stack, layout.gap12, layout.ruleB, styles.nav)}>
      {SECTIONS.map((s) => (
        <button key={s.id} type="button" className={styles.link} aria-current={active === s.id} onClick={() => scrollTo(s.id)}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
