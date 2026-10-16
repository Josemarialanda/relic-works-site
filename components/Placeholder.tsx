import { cx } from "@/lib/cx";
import styles from "./Placeholder.module.css";

// Stand-in for product photography. The design has no photos yet.
export function Placeholder({ label, fill = false, className }: { label: string; fill?: boolean; className?: string }) {
  return <div className={cx(styles.placeholder, fill && styles.fill, className)}>{label}</div>;
}
