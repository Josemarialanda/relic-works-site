"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { bagCount, useBag } from "@/lib/bag";
import { cx } from "@/lib/cx";
import styles from "./TopNav.module.css";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Bespoke", href: "/bespoke" },
  { label: "Workshop", href: "/workshop" },
  { label: "Support", href: "/support" },
];

export function TopNav() {
  const pathname = usePathname();
  const count = bagCount(useBag());
  const current = (href: string) => (pathname === href ? "page" : undefined);

  return (
    <header className={styles.nav}>
      <Link className={styles.brand} href="/">
        {/* The logo is an SVG with the letters as outlines. Its alt text is the link name. */}
        <Image className={styles.logo} src="/images/brand/logo.svg" alt="Relic Works" width={188} height={28} priority />
      </Link>
      <nav className={styles.links}>
        {LINKS.map((l) => (
          <Link key={l.href} className={cx("meta", styles.link)} href={l.href} aria-current={current(l.href)}>
            {l.label}
          </Link>
        ))}
      </nav>
      <Link className={cx("meta", styles.link)} href="/bag" aria-current={current("/bag")}>
        Bag ({count})
      </Link>
    </header>
  );
}
