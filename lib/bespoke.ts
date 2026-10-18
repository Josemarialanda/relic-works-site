// The bespoke options, the check of a bespoke order and its price. The bespoke page, the bag and the
// checkout server all use this file. The server calls parseBespoke and bespokePrice on the data that
// the browser sends, so a price in the browser is never trusted.
//
// The price rules below are PLACEHOLDERS: change them to the real prices before launch.

export type PartId = "stems" | "spacers" | "caps";

export const PART_IDS: PartId[] = ["stems", "spacers", "caps"];

export const BASE_PRICE: Record<PartId, number> = { stems: 220, spacers: 30, caps: 40 };

export const TYPES: Record<PartId, { label: string; options: string[]; initial: string }> = {
  stems: { label: "Type", options: ["Quill", "Threadless"], initial: "Threadless" },
  spacers: { label: "Steerer size", options: [`1"`, `1 1/8"`], initial: `1 1/8"` },
  caps: { label: "Type", options: ["Flat cap", "Spacer cap"], initial: "Flat cap" },
};

export const HEIGHTS: Record<PartId, { label: string; options: string[]; initial: string }> = {
  stems: { label: "Height", options: ["35 mm", "40 mm", "45 mm", "50 mm", "Custom"], initial: "40 mm" },
  spacers: { label: "Height", options: ["2.5 mm", "5 mm", "10 mm", "15 mm", "20 mm", "Custom"], initial: "10 mm" },
  // A spacer cap with no spacer is a flat cap, so there is no 0 mm option.
  caps: { label: "Integrated spacer height", options: ["5 mm", "10 mm", "15 mm", "Custom"], initial: "5 mm" },
};

export const MATERIALS = ["Steel", "Titanium", "Aluminium"];
export const BONDS = ["Brazed", "Welded"];
export const FINISHES = ["Raw", "Brushed", "Painted", "Polished"];
export const LENGTHS = ["60 mm", "75 mm", "90 mm", "110 mm", "130 mm", "Custom"];
export const ANGLES = ["±6°", "±17°", "±25°", "±35°", "Custom"];
export const COLORS = [
  { name: "Blue", hex: "#2f5fa8" },
  { name: "Red", hex: "#b3262d" },
  { name: "Orange", hex: "#d9661f" },
  { name: "Gold", hex: "#c9a24a" },
  { name: "Green", hex: "#1f7a3d" },
];

// The limits of a custom value, in mm (the angle is in degrees).
export const CUSTOM_RANGE = {
  height: { stems: [20, 100], spacers: [1, 50], caps: [1, 50] } as Record<PartId, [number, number]>,
  length: [40, 150] as [number, number],
  angle: [-40, 40] as [number, number],
};

export type BespokeConfig = {
  part: PartId;
  type: string;
  material: string;
  // Stems only. Brazing is steel only, so other materials are always welded.
  bond?: string;
  finish: string;
  // Painted only.
  color?: string;
  // Not for a flat cap. A chip value ("40 mm") or a custom value in the same format.
  height?: string;
  // Stems only.
  length?: string;
  angle?: string;
};

// Price rules (placeholders): the base price of the part, times a material factor, times
// (1 + the extras below, as fractions). The result is rounded to whole pounds.
const MATERIAL_FACTOR: Record<string, number> = { Steel: 1, Titanium: 1.4, Aluminium: 0.85 };
const BOND_EXTRA: Record<string, number> = { Brazed: 0.1, Welded: 0 };
const FINISH_EXTRA: Record<string, number> = { Raw: 0, Brushed: 0.05, Painted: 0.1, Polished: 0.15 };
// For each custom size (height, length or angle).
const CUSTOM_EXTRA = 0.1;

function isChip(options: string[], v: string): boolean {
  return v !== "Custom" && options.includes(v);
}

// True for a size such as "42 mm" or "42.5 mm" that is in the range.
function isMm(v: string, [min, max]: [number, number]): boolean {
  const m = /^(\d{1,3}(?:\.\d{1,2})?) mm$/.exec(v);
  return m !== null && Number(m[1]) >= min && Number(m[1]) <= max;
}

function isDegrees(v: string, [min, max]: [number, number]): boolean {
  const m = /^(-?\d{1,2})°$/.exec(v);
  return m !== null && Number(m[1]) >= min && Number(m[1]) <= max;
}

// Check unknown data. It gives a clean config (it drops all other fields), or null if anything is wrong.
export function parseBespoke(v: unknown): BespokeConfig | null {
  if (typeof v !== "object" || v === null) return null;
  const i = v as Record<string, unknown>;
  const str = (k: string) => (typeof i[k] === "string" ? (i[k] as string) : undefined);
  const part = str("part");
  if (!part || !PART_IDS.includes(part as PartId)) return null;
  const p = part as PartId;

  const type = str("type");
  if (!type || !TYPES[p].options.includes(type)) return null;
  const material = str("material");
  if (!material || !MATERIALS.includes(material)) return null;
  const finish = str("finish");
  if (!finish || !FINISHES.includes(finish)) return null;

  const config: BespokeConfig = { part: p, type, material, finish };

  if (finish === "Painted") {
    const color = str("color");
    if (!color || !COLORS.some((c) => c.name === color)) return null;
    config.color = color;
  }

  // A flat cap has no integrated spacer. Everything else has a height.
  const hasHeight = !(p === "caps" && type === "Flat cap");
  const height = str("height");
  if (hasHeight) {
    if (!height || !(isChip(HEIGHTS[p].options, height) || isMm(height, CUSTOM_RANGE.height[p]))) return null;
    config.height = height;
  } else if (height !== undefined) {
    return null;
  }

  if (p === "stems") {
    const bond = str("bond");
    if (!bond || !BONDS.includes(bond) || (material !== "Steel" && bond !== "Welded")) return null;
    const length = str("length");
    if (!length || !(isChip(LENGTHS, length) || isMm(length, CUSTOM_RANGE.length))) return null;
    const angle = str("angle");
    if (!angle || !(isChip(ANGLES, angle) || isDegrees(angle, CUSTOM_RANGE.angle))) return null;
    Object.assign(config, { bond, length, angle });
  } else if (str("bond") !== undefined || str("length") !== undefined || str("angle") !== undefined) {
    return null;
  }
  return config;
}

// The price in pounds.
export function bespokePrice(c: BespokeConfig): number {
  const customs = [
    c.height !== undefined && !isChip(HEIGHTS[c.part].options, c.height),
    c.length !== undefined && !isChip(LENGTHS, c.length),
    c.angle !== undefined && !isChip(ANGLES, c.angle),
  ].filter(Boolean).length;
  const extras = (c.bond ? BOND_EXTRA[c.bond] : 0) + FINISH_EXTRA[c.finish] + customs * CUSTOM_EXTRA;
  return Math.round(BASE_PRICE[c.part] * MATERIAL_FACTOR[c.material] * (1 + extras));
}

// The one-line description of the order, for the bag and the payment page.
export function bespokeSpec(c: BespokeConfig): string {
  return [
    c.type,
    c.material,
    c.bond,
    c.finish === "Painted" ? `Painted ${c.color}` : c.finish,
    c.height && `${c.height} height`,
    c.length,
    c.angle,
  ]
    .filter(Boolean)
    .join(" · ");
}

export const PART_NAME: Record<PartId, string> = { stems: "Stem", spacers: "Spacer", caps: "Cap" };
