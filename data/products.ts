// The products of the shop. Edit a name, a price, a material, a finish or an image path here.
// A price is in pounds. An image is a path in public/images. A name must be unique, and a saved bag finds
// a product by its name. See data/README.md.

export const CATEGORIES = ["Stems", "Spacers", "Caps"] as const;
export const MATERIALS = ["Steel", "Titanium", "Aluminium"] as const;
export const FINISHES = ["Raw", "Brushed", "Painted", "Polished"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Material = (typeof MATERIALS)[number];
export type Finish = (typeof FINISHES)[number];

export type Product = { name: string; cat: Category; mat: Material; fin: Finish; price: number; image: string };

export const PRODUCTS: Product[] = [
  { name: "Quill Stem", cat: "Stems", mat: "Steel", fin: "Raw", price: 210, image: "/images/shop/quill-stem.svg" },
  { name: "Threadless Stem", cat: "Stems", mat: "Steel", fin: "Painted", price: 185, image: "/images/shop/threadless-stem.svg" },
  { name: `1" Spacer`, cat: "Spacers", mat: "Aluminium", fin: "Brushed", price: 24, image: "/images/shop/spacer-1in.svg" },
  { name: `1 1/8" Spacer`, cat: "Spacers", mat: "Aluminium", fin: "Polished", price: 28, image: "/images/shop/spacer-1-1-8in.svg" },
  { name: "Flat Cap", cat: "Caps", mat: "Aluminium", fin: "Painted", price: 32, image: "/images/shop/flat-cap.svg" },
  { name: "Spacer Cap", cat: "Caps", mat: "Titanium", fin: "Raw", price: 38, image: "/images/shop/spacer-cap.svg" },
];
