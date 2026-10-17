"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cx } from "@/lib/cx";
import { useSwipe } from "@/lib/useSwipe";
import styles from "./Collage.module.css";
import { Photo } from "./Photo";

export type CollageTile = { alt: string; src: string; col?: string; row?: string };

type Props = { tiles: CollageTile[]; columns: number; rowHeight: number; className?: string };

export function Collage({ tiles, columns, rowHeight, className }: Props) {
  const [zoomed, setZoomed] = useState<CollageTile | null>(null);

  const swipe = useSwipe((d) => d === "down" && setZoomed(null));

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomed(null);
    window.addEventListener("keydown", onKey);
    // Stop the page behind the lightbox from scrolling.
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = overflow;
    };
  }, [zoomed]);

  // The grid size and tile spans are data, so they go in as custom properties and inline values.
  const gridVars = { "--columns": columns, "--row-height": `${rowHeight}px` } as CSSProperties;

  return (
    <>
      <div className={cx(styles.collage, className)} style={gridVars}>
        {tiles.map((t) => (
          <button
            key={t.alt}
            type="button"
            className={styles.tile}
            title={`View ${t.alt}`}
            style={{ gridColumn: t.col ?? "auto", gridRow: t.row ?? "auto" }}
            onClick={() => setZoomed(t)}
          >
            <Photo src={t.src} alt={t.alt} sizes="(max-width: 767px) 50vw, 33vw" />
          </button>
        ))}
      </div>
      {zoomed && (
        <div className={styles.lightbox} onClick={() => setZoomed(null)} {...swipe.handlers}>
          <Photo src={zoomed.src} alt={zoomed.alt} fit="contain" className={styles.zoomed} />
          <span className={cx("meta-b", styles.caption)}>{zoomed.alt}</span>
          <button type="button" className={styles.close} aria-label="Close">
            ×
          </button>
        </div>
      )}
    </>
  );
}
