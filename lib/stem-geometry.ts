// The rule that joins the height of a threadless steerer clamp to the angle of the stem. The body tube meets the
// clamp in a line that climbs higher on one side and lower on the other as the angle grows. The clamp must be tall
// enough to hold that line and the joint (braze or weld) around it. The bespoke page, the checkout server and the
// 3D stem all use this file, so they agree. A quill stem has a long quill, so this rule is for threadless stems only.

// The sizes in mm. The body tube is 28.9 mm across, the steerer clamp is 38 mm across. JOINT_MARGIN is the room for
// the joint above and below the line where the tubes meet.
export const BODY_RADIUS_MM = 14.45;
export const CLAMP_RADIUS_MM = 19;
export const JOINT_MARGIN_MM = 2.5;

// The height (top to bottom, in mm) of the line where a body of radius `body` meets a vertical tube of radius
// `steerer`, when the body rises or drops by `angleDeg`.
export function jointSpanMm(angleDeg: number, body = BODY_RADIUS_MM, steerer = CLAMP_RADIUS_MM): number {
  const a = (Math.abs(angleDeg) * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  let top = -Infinity;
  let low = Infinity;
  for (let i = 0; i < 180; i++) {
    const f = (i / 180) * Math.PI * 2;
    // The distance along the body to the steerer surface, for the line on the body at the angle f around it.
    const s = (body * Math.cos(f) * sin + Math.sqrt(Math.max(steerer ** 2 - (body * Math.sin(f)) ** 2, 0))) / cos;
    const y = s * sin + body * Math.cos(f) * cos;
    top = Math.max(top, y);
    low = Math.min(low, y);
  }
  return top - low;
}

// The lowest steerer clamp height, in whole mm, for a threadless stem with this angle. "17°" and "-17°" give the same.
export function minClampHeightMm(angleDeg: number): number {
  return Math.ceil(jointSpanMm(angleDeg) + 2 * JOINT_MARGIN_MM - 1e-9);
}
