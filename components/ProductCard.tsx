import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import { Photo } from "./Photo";
import { Placeholder } from "./Placeholder";
import styles from "./ProductCard.module.css";

type Props = { name: string; price: string; meta: string; image: string | null };

export function ProductCard({ name, price, meta, image }: Props) {
  return (
    <div className={styles.card}>
      {/* A product has no image until you add one in the Stripe dashboard. */}
      {image ? <Photo src={image} alt={name} sizes="(max-width: 767px) 50vw, 25vw" className={styles.image} /> : <Placeholder label={name} className={styles.image} />}
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
