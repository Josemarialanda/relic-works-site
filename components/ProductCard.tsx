import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import { Photo } from "./Photo";
import styles from "./ProductCard.module.css";

type Props = { name: string; price: string; meta: string; image: string };

export function ProductCard({ name, price, meta, image }: Props) {
  return (
    <div className={styles.card}>
      <Photo src={image} alt={name} sizes="(max-width: 767px) 50vw, 25vw" className={styles.image} />
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
