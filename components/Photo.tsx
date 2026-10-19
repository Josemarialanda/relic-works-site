"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import styles from "./Photo.module.css";

type Props = {
  src: string;
  alt: string;
  // Fill the nearest positioned parent, as the Placeholder fill does.
  fill?: boolean;
  // "contain" shows all of the photo. "cover" (the default) crops it to the box.
  fit?: "cover" | "contain";
  // The width of the box at each breakpoint, so the browser can pick the right file.
  sizes?: string;
  preload?: boolean;
  // Show a pixel pattern while the photo loads, then sharpen the photo in steps. It works for "cover" only.
  pixelate?: boolean;
  className?: string;
};

// The number of pixel blocks across the photo at each step, and the time of one step.
const STEPS = [6, 12, 24, 48];
const STEP_MS = 90;

type Phase = "loading" | "pixelating" | "done";

// Draw the photo as big pixel blocks, cropped to the box as `object-fit: cover` crops it.
function drawPixels(canvas: HTMLCanvasElement, img: HTMLImageElement, blocks: number) {
  const box = canvas.parentElement!;
  const { clientWidth: w, clientHeight: h } = box;
  canvas.width = w;
  canvas.height = h;
  const small = document.createElement("canvas");
  small.width = blocks;
  small.height = Math.max(1, Math.round((blocks * h) / w));
  // Draw the whole photo into the small canvas with a destination box only. On a 2x screen the browser reports
  // naturalWidth in CSS pixels, but a source box is in real pixels, so a source box would crop the wrong part.
  const scale = Math.max(small.width / img.naturalWidth, small.height / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  small.getContext("2d")!.drawImage(img, (small.width - dw) / 2, (small.height - dh) / 2, dw, dh);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, w, h);
}

// A photo from public/images (or a full address) that fills its box. The bone tile shows while the photo loads.
export function Photo({ src, alt, fill = false, fit = "cover", sizes = "100vw", preload, pixelate = false, className }: Props) {
  const animate = pixelate && fit === "cover";
  const [phase, setPhase] = useState<Phase>(animate ? "loading" : "done");
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loaded = () => {
    // Keep the still photo for a visitor who asks for less motion.
    setPhase((p) => (p !== "loading" ? p : matchMedia("(prefers-reduced-motion: reduce)").matches ? "done" : "pixelating"));
  };

  // The browser can finish loading a cached photo before React attaches the load handler.
  useEffect(() => {
    const img = imgRef.current;
    if (animate && img?.complete && img.naturalWidth > 0) loaded();
  }, [animate]);

  useEffect(() => {
    if (phase !== "pixelating") return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((blocks, i) => timers.push(setTimeout(() => drawPixels(canvas, img, blocks), i * STEP_MS)));
    timers.push(setTimeout(() => setPhase("done"), STEPS.length * STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  return (
    <div className={cx(styles.photo, fill && styles.fill, fit === "contain" && styles.contain, phase === "loading" && styles.loading, className)}>
      <Image
        ref={imgRef}
        className={cx(styles.image, phase !== "done" && styles.hidden)}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        preload={preload}
        onLoad={animate ? loaded : undefined}
      />
      {phase === "pixelating" && <canvas ref={canvasRef} className={styles.pixels} aria-hidden />}
    </div>
  );
}
