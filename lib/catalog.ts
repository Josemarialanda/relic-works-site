export const CATEGORIES = ["Stems", "Spacers", "Caps"] as const;
export const MATERIALS = ["Steel", "Titanium", "Aluminium"] as const;
export const FINISHES = ["Raw", "Brushed", "Painted", "Polished"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Material = (typeof MATERIALS)[number];
export type Finish = (typeof FINISHES)[number];

export type Product = { name: string; cat: Category; mat: Material; fin: Finish; price: number; image: string };

export const PRODUCTS: Product[] = [
  { name: "Relic Brazed Stem", cat: "Stems", mat: "Steel", fin: "Painted", price: 185, image: "/images/shop/relic-brazed-stem.svg" },
  { name: "Brass Short Stem", cat: "Stems", mat: "Steel", fin: "Raw", price: 195, image: "/images/shop/brass-short-stem.svg" },
  { name: "Relic Quill", cat: "Stems", mat: "Steel", fin: "Raw", price: 210, image: "/images/shop/relic-quill.svg" },
  { name: "Ti Road Stem", cat: "Stems", mat: "Titanium", fin: "Polished", price: 260, image: "/images/shop/ti-road-stem.svg" },
  { name: "CNC Trail Stem", cat: "Stems", mat: "Aluminium", fin: "Painted", price: 165, image: "/images/shop/cnc-trail-stem.svg" },
  { name: "Machined Spacer Set", cat: "Spacers", mat: "Aluminium", fin: "Painted", price: 24, image: "/images/shop/machined-spacer-set.svg" },
  { name: "Ti Spacer Stack", cat: "Spacers", mat: "Titanium", fin: "Brushed", price: 45, image: "/images/shop/ti-spacer-stack.svg" },
  { name: "Polished Spacer Set", cat: "Spacers", mat: "Aluminium", fin: "Polished", price: 32, image: "/images/shop/polished-spacer-set.svg" },
  { name: "Hammered Ti Cap", cat: "Caps", mat: "Titanium", fin: "Raw", price: 38, image: "/images/shop/hammered-ti-cap.svg" },
  { name: "Painted Cap Set", cat: "Caps", mat: "Aluminium", fin: "Painted", price: 45, image: "/images/shop/painted-cap-set.svg" },
  { name: "Polished Cap", cat: "Caps", mat: "Steel", fin: "Polished", price: 32, image: "/images/shop/polished-cap.svg" },
];
