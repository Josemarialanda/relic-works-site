// The bespoke options and the price rules. Edit the options and the prices here.
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

export const PART_NAME: Record<PartId, string> = { stems: "Stem", spacers: "Spacer", caps: "Cap" };

// Price rules: the base price of the part, times a material factor, times
// (1 + the extras below, as fractions). The result is rounded to whole pounds.
export const MATERIAL_FACTOR: Record<string, number> = { Steel: 1, Titanium: 1.4, Aluminium: 0.85 };
export const BOND_EXTRA: Record<string, number> = { Brazed: 0.1, Welded: 0 };
export const FINISH_EXTRA: Record<string, number> = { Raw: 0, Brushed: 0.05, Painted: 0.1, Polished: 0.15 };
// For each custom size (height, length or angle).
export const CUSTOM_EXTRA = 0.1;
