"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cx } from "@/lib/cx";
import styles from "./Collage.module.css";
import { Placeholder } from "./Placeholder";

export type CollageTile = { alt: string; col?: string; row?: string };

type Props = { tiles: CollageTile[]; columns: number; rowHeight: number; className?: string };

export function Collage({ tiles, columns, rowHeight, className }: Props) {
  const [zoomed, setZoomed] = useState<string | null>(null);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomed(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
            onClick={() => setZoomed(t.alt)}
          >
            <Placeholder label={t.alt} />
          </button>
        ))}
      </div>
      {zoomed && (
        <div className={styles.lightbox} onClick={() => setZoomed(null)}>
          <Placeholder label={zoomed} className={styles.zoomed} />
          <span className={cx("meta-b", styles.caption)}>{zoomed}</span>
          <button type="button" className={styles.close} aria-label="Close">
            ×
          </button>
        </div>
      )}
    </>
  );
}
