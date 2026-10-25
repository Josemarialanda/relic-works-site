"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import { Photo } from "./Photo";
import { Placeholder } from "./Placeholder";
import { WakeSlider } from "./WakeSlider";
import styles from "./ProductPicture.module.css";

// The zoom of the glass: the slider goes from 0 to 100, which is 1x to 2x.
const MIN_ZOOM = 1;
const MAX_ZOOM = 2;
const START = 50; // 1.5x
const zoomOf = (v: number) => MIN_ZOOM + (v / 100) * (MAX_ZOOM - MIN_ZOOM);

// The glass code (WebGL) loads only when a visitor turns the glass on.
const GlassBubble = dynamic(() => import("./GlassBubble").then((m) => m.GlassBubble), { ssr: false });

// The big picture on a product page. The magnifier button in the top right corner turns on a ball of glass
// that the visitor drags over the picture, and a slider to the left of the button that sets its zoom.
export function ProductPicture({ image, name }: { image: string | null; name: string }) {
  const [glass, setGlass] = useState(false);
  const [zoom, setZoom] = useState(START);

  // Escape turns the glass off.
  useEffect(() => {
    if (!glass) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setGlass(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [glass]);

  if (!image) {
    return (
      <div className={styles.column}>
        <div className={styles.picture}>
          <Placeholder label={name} fill />
        </div>
      </div>
    );
  }

  // The glass reads the picture as a WebGL texture, and the browser blocks a picture from another site (the
  // Stripe host) for that. The image optimizer of Next.js gives the same picture from this site, at a good size.
  const sameSite = `/_next/image?url=${encodeURIComponent(image)}&w=1200&q=75`;

  return (
    <div className={styles.column}>
      <div className={styles.picture}>
        <Photo src={image} alt={name} sizes="(max-width: 767px) 100vw, 58vw" preload pixelate fill />
        {glass && (
          // The canvas is wider than the picture: the picture is 440 of its 620 units, and the rest is a margin
          // that is clipped by the box. The photograph in the canvas then has the size of the box.
          <div className={styles.glass}>
            <GlassBubble src={sameSite} width="100%" corner={0} confine zoom={zoomOf(zoom)} />
          </div>
        )}
        <div className={styles.controls}>
          {glass && (
            <div className={styles.zoom}>
              {/* The slider keeps its value when the glass turns off and on again. */}
              <WakeSlider label="Zoom of the magnifying glass" bars={16} defaultValue={zoom} onChange={setZoom} format={(v) => `${zoomOf(v).toFixed(1)}×`} />
            </div>
          )}
          <button
            type="button"
            className={cx(styles.toggle, glass && styles.on)}
            aria-pressed={glass}
            aria-label={glass ? "Turn off the magnifying glass" : "Turn on the magnifying glass"}
            title={glass ? "Turn off the glass" : "Magnifying glass"}
            onClick={() => setGlass((g) => !g)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5 21 21" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
