// Stem geometry for the stem calculator. All lengths are in mm, all angles in degrees.
// Coordinates: x points forward, y points up. The origin is the top of the head tube,
// which is the bottom of the headset spacers.

export type Stem = { length: number; angle: number; spacers: number };
export type Point = { x: number; y: number };

const rad = (deg: number) => (deg * Math.PI) / 180;

// The unit vector up the steerer. The steerer leans back, so x is negative.
export function steererUp(headAngle: number): Point {
  return { x: -Math.cos(rad(headAngle)), y: Math.sin(rad(headAngle)) };
}

// The stem clamp centre (on the steerer, above the spacers) and the handlebar clamp centre.
// A 0° stem is at 90° to the steerer, so its angle from horizontal is 90° minus the head angle.
export function stemPoints(headAngle: number, stem: Stem): { clamp: Point; bar: Point } {
  const up = steererUp(headAngle);
  const clamp = { x: up.x * stem.spacers, y: up.y * stem.spacers };
  const fromHorizontal = rad(90 - headAngle + stem.angle);
  const bar = { x: clamp.x + stem.length * Math.cos(fromHorizontal), y: clamp.y + stem.length * Math.sin(fromHorizontal) };
  return { clamp, bar };
}

// How much higher and longer (more reach) the handlebar of stem a is than that of stem b.
// A negative value means lower or shorter.
export function compareStems(headAngle: number, a: Stem, b: Stem): { higher: number; longer: number } {
  const pa = stemPoints(headAngle, a).bar;
  const pb = stemPoints(headAngle, b).bar;
  return { higher: pa.y - pb.y, longer: pa.x - pb.x };
}
