import { Photo } from "./Photo";
import { Placeholder } from "./Placeholder";
import styles from "./ProductPicture.module.css";

// The big picture on a product page.
export function ProductPicture({ image, name }: { image: string | null; name: string }) {
  return (
    <div className={styles.column}>
      <div className={styles.picture}>
        {image ? <Photo src={image} alt={name} sizes="(max-width: 767px) 100vw, 58vw" preload pixelate fill /> : <Placeholder label={name} fill />}
      </div>
    </div>
  );
}
