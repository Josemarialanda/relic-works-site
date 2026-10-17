import Image from "next/image";
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
  className?: string;
};

// A photo from public/images that fills its box. The bone tile shows while the photo loads.
export function Photo({ src, alt, fill = false, fit = "cover", sizes = "100vw", preload, className }: Props) {
  return (
    <div className={cx(styles.photo, fill && styles.fill, fit === "contain" && styles.contain, className)}>
      <Image className={styles.image} src={src} alt={alt} fill sizes={sizes} preload={preload} />
    </div>
  );
}
