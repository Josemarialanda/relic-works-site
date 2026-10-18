import type { Metadata } from "next";
import Link from "next/link";
import button from "@/components/ui/button.module.css";
import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import styles from "./not-found.module.css";

export const metadata: Metadata = { title: "Page not found" };

// The page for an address that does not exist. It uses the layout of the site, so the navigation and the
// footer show. (The built-in 404 page of Next.js is as high as the window, so the page would scroll.)
export default function NotFound() {
  return (
    <main className={layout.ruleB}>
      <div className={layout.sectionHead}>
        <h1 className="heading">Page not found.</h1>
      </div>
      <div className={cx(layout.stack, layout.gap20, styles.body)}>
        <p className={cx("body-copy", styles.lead)}>This page does not exist, or it has moved. Use the menu, or go to one of these pages.</p>
        <div className={styles.actions}>
          <Link className={cx(button.button, button.compact)} href="/shop">
            Shop parts
          </Link>
          <Link className={cx(button.button, button.outline)} href="/">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
