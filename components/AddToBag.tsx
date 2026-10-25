"use client";

import { useState } from "react";
import { addToBag, useBag } from "@/lib/bag";
import { MAX_QTY, maxQty, specOf, type Product } from "@/lib/catalog";
import { cx } from "@/lib/cx";
import button from "./ui/button.module.css";

// The "Add to bag" button of a product, for the shop and for the product page. A product that is sold out has
// the button off. When the bag already has the most of a product, a press shows a note and adds nothing.
export function AddToBag({ product, small = true }: { product: Product; small?: boolean }) {
  const bag = useBag();
  const [tried, setTried] = useState(false);

  const key = `${product.name}|${specOf(product)}`;
  const atLimit = (bag.find((i) => i.key === key)?.qty ?? 0) >= maxQty(product);
  const soldOut = product.stock === 0;

  const add = () => {
    if (atLimit) return setTried(true);
    addToBag({ key, type: product.cat, name: product.name, spec: specOf(product), price: product.price, image: product.image }, maxQty(product));
  };

  return (
    <>
      <button type="button" className={cx(button.button, small && button.small, button.block)} disabled={soldOut} onClick={add}>
        {soldOut ? "Sold out" : "Add to bag"}
      </button>
      {tried && atLimit && (
        <span className="meta" role="status">
          {product.stock !== null && product.stock < MAX_QTY ? `Only ${product.stock} in stock. You have all of them in your bag.` : `You can order up to ${MAX_QTY} of one item.`}
        </span>
      )}
    </>
  );
}
