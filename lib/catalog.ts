export const CATEGORIES = ["Stems", "Spacers", "Caps"] as const;
export const MATERIALS = ["Steel", "Titanium", "Aluminium"] as const;
export const FINISHES = ["Raw", "Brushed", "Painted", "Polished"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Material = (typeof MATERIALS)[number];
export type Finish = (typeof FINISHES)[number];

export type Product = { name: string; cat: Category; mat: Material; fin: Finish; price: number };

export const PRODUCTS: Product[] = [
  { name: "Relic Brazed Stem", cat: "Stems", mat: "Steel", fin: "Painted", price: 185 },
  { name: "Brass Short Stem", cat: "Stems", mat: "Steel", fin: "Raw", price: 195 },
  { name: "Relic Quill", cat: "Stems", mat: "Steel", fin: "Raw", price: 210 },
  { name: "Ti Road Stem", cat: "Stems", mat: "Titanium", fin: "Polished", price: 260 },
  { name: "CNC Trail Stem", cat: "Stems", mat: "Aluminium", fin: "Painted", price: 165 },
  { name: "Machined Spacer Set", cat: "Spacers", mat: "Aluminium", fin: "Painted", price: 24 },
  { name: "Ti Spacer Stack", cat: "Spacers", mat: "Titanium", fin: "Brushed", price: 45 },
  { name: "Polished Spacer Set", cat: "Spacers", mat: "Aluminium", fin: "Polished", price: 32 },
  { name: "Hammered Ti Cap", cat: "Caps", mat: "Titanium", fin: "Raw", price: 38 },
  { name: "Painted Cap Set", cat: "Caps", mat: "Aluminium", fin: "Painted", price: 45 },
  { name: "Polished Cap", cat: "Caps", mat: "Steel", fin: "Polished", price: 32 },
];
