import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import { Placeholder } from "./Placeholder";
import styles from "./ProductCard.module.css";

type Props = { name: string; price: string; meta: string };

export function ProductCard({ name, price, meta }: Props) {
  return (
    <div className={styles.card}>
      <Placeholder label={name} className={styles.image} />
      <div className={styles.body}>
        <span className="meta muted">{meta}</span>
        <div className={layout.between}>
          <span className={styles.name}>{name}</span>
          <span>{price}</span>
        </div>
      </div>
    </div>
  );
}
