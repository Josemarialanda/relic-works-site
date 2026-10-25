// The bag thumbnail of a bespoke part: the 3D view as the customer sees it when they add the part. The part is cut
// out of the transparent canvas, put in the middle of a square on the bone colour of the image tiles, and saved as a
// small JPEG data URL, so it can go in the saved bag.

const SIZE = 320;
const MARGIN = 0.1;
const BONE = "#f0f1ef";

// The thumbnail, or null when the canvas is empty or the browser cannot read it.
export function modelThumbnail(canvas: HTMLCanvasElement): string | null {
  const { width: w, height: h } = canvas;
  if (!w || !h) return null;
  try {
    const copy = document.createElement("canvas");
    copy.width = w;
    copy.height = h;
    const cx = copy.getContext("2d");
    if (!cx) return null;
    cx.drawImage(canvas, 0, 0);
    // The box of the pixels that are not transparent.
    const data = cx.getImageData(0, 0, w, h).data;
    let left = w, top = h, right = -1, bottom = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 8) {
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
    }
    if (right < 0) return null;
    const bw = right - left + 1;
    const bh = bottom - top + 1;
    const out = document.createElement("canvas");
    out.width = out.height = SIZE;
    const ox = out.getContext("2d");
    if (!ox) return null;
    ox.fillStyle = BONE;
    ox.fillRect(0, 0, SIZE, SIZE);
    const scale = (SIZE * (1 - 2 * MARGIN)) / Math.max(bw, bh);
    ox.drawImage(copy, left, top, bw, bh, (SIZE - bw * scale) / 2, (SIZE - bh * scale) / 2, bw * scale, bh * scale);
    return out.toDataURL("image/jpeg", 0.85);
  } catch (err) {
    console.error("Could not make the bag thumbnail", err);
    return null;
  }
}
