// The check of a bespoke order, its price and its description. The bespoke page, the bag and the checkout
// server all use this file. The server calls parseBespoke and bespokePrice on the data that the browser
// sends, so a price in the browser is never trusted. The options and the price rules are in data/bespoke.json.

import {
  ANGLES,
  BASE_PRICE,
  BONDS,
  BOND_EXTRA,
  COLORS,
  CUSTOM_EXTRA,
  CUSTOM_RANGE,
  FINISHES,
  FINISH_EXTRA,
  HEIGHTS,
  LENGTHS,
  MATERIALS,
  MATERIAL_FACTOR,
  PART_IDS,
  TYPES,
  type PartId,
} from "../data/bespoke";

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
