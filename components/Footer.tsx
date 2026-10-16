import Link from "next/link";
import { cx } from "@/lib/cx";
import styles from "./Footer.module.css";

// Hash links use <a> so that the target page gets a native hashchange event.
export function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={cx("subheading", styles.wordmark)}>Relic Works</span>
      <div className={styles.column}>
        <Link href="/shop">Shop</Link>
        <a href="/shop#Stems">Stems</a>
        <a href="/shop#Spacers">Spacers</a>
        <a href="/shop#Caps">Caps</a>
      </div>
      <div className={styles.column}>
        <Link href="/bespoke">Bespoke</Link>
        <a href="/bespoke#stems">Stems</a>
        <a href="/bespoke#spacers">Spacers</a>
        <a href="/bespoke#caps">Caps</a>
      </div>
      <div className={styles.column}>
        <Link href="/workshop">Workshop</Link>
      </div>
      <div className={styles.column}>
        <Link href="/support">Support</Link>
        <a href="/support#shipping">Shipping &amp; returns</a>
        <a href="/support#guarantee">Guarantee</a>
      </div>
    </footer>
  );
}
