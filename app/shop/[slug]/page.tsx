import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToBag } from "@/components/AddToBag";
import { ProductPicture } from "@/components/ProductPicture";
import { productBySlug } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-server";
import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import styles from "./product.module.css";

type Props = { params: Promise<{ slug: string }> };

// The page of one product. The address is /shop/<slug>, and the slug is the product name in lower case with a
// hyphen between the words (see slugify in lib/catalog.ts). A product that is added in Stripe later gets its page
// the first time that someone opens it.
export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = productBySlug((await getCatalog()).products, slug);
  if (!product) return { title: "Product not found" };
  const description = product.description ?? `${product.name}, ${product.mat.toLowerCase()}, ${product.fin.toLowerCase()}. Made in the UK.`;
  return { title: product.name, description, openGraph: { title: product.name, description, ...(product.image && { images: [product.image] }) } };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = productBySlug((await getCatalog()).products, slug);
  if (!product) notFound();

  const details = [
    ["Product", product.cat],
    ["Material", product.mat],
    ["Finish", product.fin],
  ];

  return (
    <main className={cx(styles.product, layout.ruleB)}>
      <ProductPicture image={product.image} name={product.name} />

      <div className={cx(layout.stack, layout.gap20, styles.details)}>
        <Link className="meta" href={`/shop#${encodeURIComponent(product.cat)}`}>
          ← Shop · {product.cat}
        </Link>
        <h1 className="heading">{product.name}</h1>
        <span className="subheading">£{product.price}</span>
        {product.description && <p className={cx("body-copy", styles.description)}>{product.description}</p>}

        <div className={styles.facts}>
          {details.map(([label, value]) => (
            <div key={label} className={cx(layout.between, layout.ruleT, styles.fact)}>
              <span className="meta muted">{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>

        <div className={cx(layout.stack, layout.gap12)}>
          <AddToBag product={product} small={false} />
          <Link className="meta" href="/bag">
            View your bag
          </Link>
        </div>
      </div>
    </main>
  );
}
