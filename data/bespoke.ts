// The bespoke options and the price rules. Edit data/bespoke.json: the options, the limits of the custom
// sizes, the default choices and the prices. See data/README.md.
// The price rules are PLACEHOLDERS: change them to the real prices before launch.

import raw from "./bespoke.json";
import { fail, number, numbersFor, object, oneOf, range, string, strings } from "./validate";

export type PartId = "stems" | "spacers" | "caps";

export const PART_IDS: PartId[] = ["stems", "spacers", "caps"];

type Choice = { label: string; options: string[]; initial: string };

export type BespokeData = {
  partName: Record<PartId, string>;
  basePrice: Record<PartId, number>;
  types: Record<PartId, Choice>;
  heights: Record<PartId, Choice>;
  heightRange: Record<PartId, [number, number]>;
  materials: string[];
  bonds: string[];
  finishes: string[];
  lengths: string[];
  angles: string[];
  lengthRange: [number, number];
  angleRange: [number, number];
  defaults: { material: string; bond: string; finish: string; length: string; angle: string };
  materialFactor: Record<string, number>;
  bondExtra: Record<string, number>;
  finishExtra: Record<string, number>;
  customExtra: number;
};

const FILE = "bespoke.json";

// The code (lib/bespoke.ts and the bespoke page) uses these names, so they must stay in the lists.
function need(list: string[], value: string, where: string, why: string) {
  if (!list.includes(value)) fail(FILE, where, `must include "${value}": ${why}`);
}

function choice(v: unknown, where: string): Choice {
  const c = object(v, FILE, where);
  const options = strings(c.options, FILE, `${where}.options`);
  return { label: string(c.label, FILE, `${where}.label`), options, initial: oneOf(c.initial, options, FILE, `${where}.initial`) };
}

export function parseBespokeData(data: unknown): BespokeData {
  const root = object(data, FILE, "the file");
  const parts = object(root.parts, FILE, "parts");
  const out = { partName: {}, basePrice: {}, types: {}, heights: {}, heightRange: {} } as unknown as Pick<
    BespokeData,
    "partName" | "basePrice" | "types" | "heights" | "heightRange"
  >;
  for (const id of PART_IDS) {
    const where = `parts.${id}`;
    const part = object(parts[id], FILE, where);
    out.partName[id] = string(part.name, FILE, `${where}.name`);
    out.basePrice[id] = number(part.basePrice, FILE, `${where}.basePrice`, 0.01, 100000);
    out.types[id] = choice(part.type, `${where}.type`);
    const height = object(part.height, FILE, `${where}.height`);
    out.heights[id] = choice(height, `${where}.height`);
    out.heightRange[id] = range(height.customRange, FILE, `${where}.height.customRange`);
  }
  need(out.types.caps.options, "Flat cap", "parts.caps.type.options", "a flat cap has no integrated spacer, so the code gives it no height");

  const materials = strings(root.materials, FILE, "materials");
  const bonds = strings(root.bonds, FILE, "bonds");
  const finishes = strings(root.finishes, FILE, "finishes");
  const lengths = strings(root.lengths, FILE, "lengths");
  const angles = strings(root.angles, FILE, "angles");
  need(materials, "Steel", "materials", "only steel can be brazed");
  need(bonds, "Welded", "bonds", "all the other materials are welded");
  need(bonds, "Brazed", "bonds", "the page offers brazing for steel");


  const d = object(root.defaults, FILE, "defaults");
  const defaults = {
    material: oneOf(d.material, materials, FILE, "defaults.material"),
    bond: oneOf(d.bond, bonds, FILE, "defaults.bond"),
    finish: oneOf(d.finish, finishes, FILE, "defaults.finish"),
    length: oneOf(d.length, lengths, FILE, "defaults.length"),
    angle: oneOf(d.angle, angles, FILE, "defaults.angle"),
  };
  if (defaults.length === "Custom" || defaults.angle === "Custom") fail(FILE, "defaults", "the length and the angle cannot start as Custom");

  const custom = object(root.customRange, FILE, "customRange");
  const pricing = object(root.pricing, FILE, "pricing");
  return {
    ...out,
    materials,
    bonds,
    finishes,
    lengths,
    angles,
    lengthRange: range(custom.length, FILE, "customRange.length"),
    angleRange: range(custom.angle, FILE, "customRange.angle"),
    defaults,
    materialFactor: numbersFor(pricing.materialFactor, materials, FILE, "pricing.materialFactor", 0, true),
    bondExtra: numbersFor(pricing.bondExtra, bonds, FILE, "pricing.bondExtra", 0),
    finishExtra: numbersFor(pricing.finishExtra, finishes, FILE, "pricing.finishExtra", 0),
    customExtra: number(pricing.customExtra, FILE, "pricing.customExtra", 0, 10),
  };
}

const data = parseBespokeData(raw);

export const PART_NAME = data.partName;
export const BASE_PRICE = data.basePrice;
export const TYPES = data.types;
export const HEIGHTS = data.heights;
export const MATERIALS = data.materials;
export const BONDS = data.bonds;
export const FINISHES = data.finishes;
export const LENGTHS = data.lengths;
export const ANGLES = data.angles;
export const DEFAULTS = data.defaults;

// The limits of a custom value, in mm (the angle is in degrees).
export const CUSTOM_RANGE = { height: data.heightRange, length: data.lengthRange, angle: data.angleRange };

// Price rules: the base price of the part, times a material factor, times
// (1 + the extras below, as fractions). The result is rounded to whole pounds.
export const MATERIAL_FACTOR = data.materialFactor;
export const BOND_EXTRA = data.bondExtra;
export const FINISH_EXTRA = data.finishExtra;
// For each custom size (height, length or angle).
export const CUSTOM_EXTRA = data.customExtra;
