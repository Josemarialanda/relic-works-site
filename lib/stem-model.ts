// The look of the 3D part on the bespoke page: a stem, a spacer or a cap. This file turns the options of the customer
// into the numbers that the 3D model needs. It has no three.js code, so a test can run it. The model itself is
// components/StemModel.tsx.

import type { PartId } from "../data/bespoke";
import type { BespokeConfig } from "./bespoke";

export type StemParams = {
  // The part that the model shows.
  part: PartId;
  // A spacer: the steerer size ('1"' or '1 1/8"'). A cap: "Flat cap" or "Spacer cap".
  spacerSize: string;
  capType: string;
  // The height of a spacer, or of the integrated spacer of a cap, in mm. Each part keeps its own height.
  partHeightMm: number;
  // The stem.
  type: "Quill" | "Threadless";
  // The distance from the steerer axis to the handlebar axis, in mm.
  lengthMm: number;
  // The height of the steerer clamp, in mm. A positive rise turns the body up.
  heightMm: number;
  riseDeg: number;
  // The colour of the metal as "#rrggbb", and the surface.
  color: string;
  metalness: number;
  roughness: number;
  // The finish "Brushed" has fine lines along the part.
  brushed: boolean;
  bond: "Brazed" | "Welded";
  // The names of the options, for the data attributes and the label.
  material: string;
  finish: string;
};

// The colour of the bare metal. The material does not change the shape of the stem.
const METAL: Record<string, string> = { Steel: "#8d9196", Titanium: "#77716c" };

// The surface of each finish.
const SURFACE: Record<string, { metalness: number; roughness: number }> = {
  Raw: { metalness: 1, roughness: 0.62 },
  Brushed: { metalness: 1, roughness: 0.36 },
  Polished: { metalness: 1, roughness: 0.05 },
};

// The first number in a text such as "90 mm", "17°" or "-12°". A negative angle is a stem that drops.
function numberIn(v: string | undefined): number | null {
  const m = v === undefined ? null : /(-?\d+(?:\.\d+)?)/.exec(v);
  return m ? Number(m[1]) : null;
}

// The look for a draft of the order. A field that is missing or wrong (for example the height of a flat cap, which
// has none) keeps its value from `before`.
export function stemParams(draft: Partial<BespokeConfig>, before: StemParams): StemParams {
  const finish = draft.finish && draft.finish in SURFACE ? draft.finish : before.finish;
  const material = draft.material && draft.material in METAL ? draft.material : before.material;
  const surface = SURFACE[finish];
  const part = draft.part ?? before.part;
  const stem = part === "stems";
  return {
    part,
    spacerSize: part === "spacers" && (draft.type === '1"' || draft.type === '1 1/8"') ? draft.type : before.spacerSize,
    capType: part === "caps" && (draft.type === "Flat cap" || draft.type === "Spacer cap") ? draft.type : before.capType,
    partHeightMm: stem ? before.partHeightMm : (numberIn(draft.height) ?? before.partHeightMm),
    type: stem && (draft.type === "Quill" || draft.type === "Threadless") ? draft.type : before.type,
    lengthMm: numberIn(draft.length) ?? before.lengthMm,
    heightMm: stem ? (numberIn(draft.height) ?? before.heightMm) : before.heightMm,
    riseDeg: numberIn(draft.angle) ?? before.riseDeg,
    color: METAL[material],
    material,
    ...surface,
    brushed: finish === "Brushed",
    bond: draft.bond === "Brazed" || draft.bond === "Welded" ? draft.bond : before.bond,
    finish,
  };
}

// The look of a new stem, before the customer picks anything.
export const FIRST_STEM: StemParams = {
  part: "stems",
  spacerSize: '1 1/8"',
  capType: "Flat cap",
  partHeightMm: 10,
  type: "Threadless",
  lengthMm: 90,
  heightMm: 45,
  riseDeg: 0,
  color: METAL.Steel,
  ...SURFACE.Raw,
  brushed: false,
  bond: "Brazed",
  material: "Steel",
  finish: "Raw",
};
