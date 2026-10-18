// Draws the mock product illustrations (SVG) in public/images. Run it with `npm run images`.
// It writes over the files that it makes, so do not run it after you add a real photo with the same name.
import { writeFileSync } from "node:fs";

const IMAGES = new URL("../public/images/", import.meta.url);

// Finish colours: [dark, mid, light, highlight]. Polished has a hard, bright highlight.
const FIN = {
  raw: ["#45484c", "#7d8186", "#a9adb1", "#d4d7da"],
  brushed: ["#7b7f84", "#aeb2b6", "#cfd2d5", "#eceef0"],
  polished: ["#2e3238", "#8a9097", "#c9ced3", "#ffffff"],
  ti: ["#4a453e", "#857d71", "#aaa194", "#d6cfc3"],
  green: ["#0c3d1e", "#1f7a3d", "#3d9a5a", "#8fd0a3"],
  red: ["#5c0f13", "#b3262d", "#cf4a50", "#f0a0a3"],
  black: ["#050506", "#1c1d20", "#34363a", "#8a8d92"],
  bolt: ["#141517", "#3a3c40", "#5d6066", "#a3a6ab"],
};

function defs() {
  let d = "";
  for (const [k, [dark, mid, light, hi]] of Object.entries(FIN)) {
    const hard = k === "polished";
    // Vertical cylinder: light from the upper left.
    d += `<linearGradient id="cyl-${k}" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${dark}"/><stop offset="${hard ? 0.16 : 0.12}" stop-color="${mid}"/>
      <stop offset="${hard ? 0.3 : 0.32}" stop-color="${hi}"/><stop offset="${hard ? 0.42 : 0.5}" stop-color="${hard ? dark : light}"/>
      <stop offset="0.78" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`;
    // Flat face that tilts up: light on top.
    d += `<linearGradient id="flat-${k}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${hi}"/><stop offset="0.35" stop-color="${light}"/><stop offset="${hard ? 0.55 : 0.75}" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`;
    // Top face of a ring or cap.
    d += `<linearGradient id="top-${k}" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${hi}"/><stop offset="0.5" stop-color="${light}"/><stop offset="1" stop-color="${mid}"/></linearGradient>`;
    // End of a cylinder seen head on (the bar clamp).
    d += `<radialGradient id="rad-${k}" cx="0.36" cy="0.3" r="0.8">
      <stop offset="0" stop-color="${hi}"/><stop offset="0.35" stop-color="${light}"/><stop offset="0.75" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></radialGradient>`;
  }
  d += `<radialGradient id="bore" cx="0.5" cy="0.62" r="0.6"><stop offset="0" stop-color="#5a5d61"/><stop offset="0.7" stop-color="#1e2022"/><stop offset="1" stop-color="#0c0d0e"/></radialGradient>
    <linearGradient id="hole" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0d0e0f"/><stop offset="0.6" stop-color="#2a2c2f"/><stop offset="1" stop-color="#6b6e72"/></linearGradient>
    <radialGradient id="shadow"><stop offset="0" stop-color="#000" stop-opacity="0.32"/><stop offset="0.6" stop-color="#000" stop-opacity="0.1"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <linearGradient id="studio" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f7f8f6"/><stop offset="0.62" stop-color="#eeefec"/><stop offset="1" stop-color="#e2e3df"/></linearGradient>
    <linearGradient id="bench" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d8d2c8"/><stop offset="0.04" stop-color="#cfc8bc"/><stop offset="1" stop-color="#b9b1a4"/></linearGradient>`;
  return `<defs>${d}</defs>`;
}

const shadow = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#shadow)"/>`;
const hex = (cx, cy, r, sy = 1) =>
  `<polygon points="${[0, 1, 2, 3, 4, 5].map((i) => `${(cx + r * Math.cos((Math.PI / 3) * i)).toFixed(1)},${(cy + r * sy * Math.sin((Math.PI / 3) * i)).toFixed(1)}`).join(" ")}" fill="#0b0c0d"/>`;
const bolt = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#rad-bolt)"/>${hex(cx, cy, r * 0.48)}`;

// Each product draws in a local box with its centre near (500, 500) and its floor at y 820.

function threadless(f) {
  return `${shadow(580, 730, 380, 30)}
  <path d="M405 430 C520 408 630 382 705 356 L738 532 C640 556 520 584 405 612 Z" fill="url(#flat-${f})"/>
  <path d="M405 612 C520 584 640 556 738 532" stroke="#000" stroke-opacity="0.25" stroke-width="5" fill="none"/>
  <rect x="250" y="318" width="170" height="390" rx="22" fill="url(#cyl-${f})"/>
  <rect x="250" y="318" width="170" height="16" rx="8" fill="#fff" opacity="0.35"/>
  <rect x="250" y="692" width="170" height="16" rx="8" fill="#000" opacity="0.18"/>
  <rect x="226" y="318" width="34" height="390" rx="10" fill="url(#cyl-${f})"/>
  <line x1="243" y1="324" x2="243" y2="702" stroke="#000" stroke-opacity="0.55" stroke-width="5"/>
  ${bolt(300, 410, 26)}${bolt(300, 616, 26)}
  <circle cx="770" cy="445" r="132" fill="url(#rad-${f})"/>
  <circle cx="770" cy="445" r="86" fill="url(#bore)"/>
  <path d="M700 480 A86 86 0 0 0 840 480" stroke="#fff" stroke-opacity="0.18" stroke-width="5" fill="none"/>
  <rect x="872" y="330" width="60" height="230" rx="26" fill="url(#cyl-${f})"/>
  <line x1="872" y1="345" x2="872" y2="545" stroke="#000" stroke-opacity="0.5" stroke-width="5"/>
  ${bolt(902, 366, 17)}${bolt(902, 524, 17)}`;
}

function quill(f) {
  return `${shadow(560, 836, 330, 30)}
  <rect x="322" y="300" width="100" height="420" rx="10" fill="url(#cyl-${f})"/>
  <path d="M322 712 L422 680 L422 800 Q422 818 404 818 L340 818 Q322 818 322 800 Z" fill="url(#cyl-${f})"/>
  <line x1="322" y1="712" x2="422" y2="680" stroke="#000" stroke-opacity="0.7" stroke-width="5"/>
  <path d="M420 334 C520 324 620 312 700 300 L708 382 C620 390 520 398 420 404 Z" fill="url(#flat-${f})"/>
  <path d="M420 404 C520 398 620 390 708 382" stroke="#000" stroke-opacity="0.22" stroke-width="5" fill="none"/>
  <rect x="300" y="296" width="146" height="126" rx="44" fill="url(#cyl-${f})"/>
  <path d="M446 330 Q480 340 470 368 Q480 396 446 404" fill="url(#flat-${f})"/>
  <rect x="346" y="256" width="52" height="46" rx="8" fill="url(#cyl-bolt)"/>
  ${hex(372, 262, 14, 0.35)}
  <circle cx="762" cy="338" r="102" fill="url(#rad-${f})"/>
  <circle cx="762" cy="338" r="64" fill="url(#bore)"/>
  <rect x="726" y="428" width="72" height="54" rx="12" fill="url(#cyl-${f})"/>
  <line x1="762" y1="400" x2="762" y2="440" stroke="#000" stroke-opacity="0.55" stroke-width="5"/>
  ${bolt(762, 455, 15)}`;
}

// A ring seen from above at an angle. top is the y of the top face centre.
function ring(cx, top, rx, h, f, hole = 0.56) {
  const ry = rx * 0.32;
  return `<path d="M${cx - rx} ${top} L${cx - rx} ${top + h} A${rx} ${ry} 0 0 0 ${cx + rx} ${top + h} L${cx + rx} ${top} Z" fill="url(#cyl-${f})"/>
  <path d="M${cx - rx} ${top + h} A${rx} ${ry} 0 0 0 ${cx + rx} ${top + h}" stroke="#000" stroke-opacity="0.22" stroke-width="4" fill="none"/>
  <ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="url(#top-${f})"/>
  <ellipse cx="${cx}" cy="${top}" rx="${rx - 7}" ry="${ry - 3}" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="3"/>
  ${hole ? `<ellipse cx="${cx}" cy="${top}" rx="${rx * hole}" ry="${ry * hole}" fill="url(#hole)"/>` : ""}`;
}

// Spacers stacked from the bottom up. Each item is [height, finish].
function stack(cx, floor, rx, items, hole) {
  let out = shadow(cx + 40, floor + rx * 0.3, rx * 1.35, rx * 0.36);
  let y = floor;
  for (const [h, f] of items) {
    y -= h;
    out += ring(cx, y, rx, h, f, hole);
    y -= 6;
  }
  return out;
}

// A top cap. spacer is the height of the integrated spacer (0 for a flat cap).
function cap(cx, floor, rx, f, spacer = 0) {
  const ry = rx * 0.32;
  const h = 46;
  const top = floor - h - spacer;
  let out = shadow(cx + 40, floor + ry * 0.9, rx * 1.4, ry * 1.1);
  if (spacer) out += ring(cx, top + h, rx * 0.94, spacer, f, 0) + `<path d="M${cx - rx * 0.94} ${top + h + 10} A${rx * 0.94} ${ry * 0.94} 0 0 0 ${cx + rx * 0.94} ${top + h + 10}" stroke="#000" stroke-opacity="0.3" stroke-width="3" fill="none"/>`;
  out += `<path d="M${cx - rx} ${top} L${cx - rx} ${top + h} A${rx} ${ry} 0 0 0 ${cx + rx} ${top + h} L${cx + rx} ${top} Z" fill="url(#cyl-${f})"/>
  <ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="url(#top-${f})"/>
  <ellipse cx="${cx}" cy="${top}" rx="${rx * 0.9}" ry="${ry * 0.9}" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="4"/>
  <ellipse cx="${cx}" cy="${top + 3}" rx="${rx * 0.3}" ry="${ry * 0.3}" fill="url(#hole)"/>
  <ellipse cx="${cx}" cy="${top + 2}" rx="${rx * 0.2}" ry="${ry * 0.2}" fill="url(#rad-bolt)"/>
  ${hex(cx, top + 2, rx * 0.085, 0.32)}`;
  return out;
}

const place = (svg, x, y, s, rot = 0) => `<g transform="translate(${x} ${y}) scale(${s}) rotate(${rot} 500 500)">${svg}</g>`;
const studio = (w, h) => `<rect width="${w}" height="${h}" fill="url(#studio)"/>`;
const doc = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs()}${studio(w, h)}${body}</svg>\n`;

// Bounding box of each drawing (with its shadow), for fit().
const BOX = {
  quill: [300, 256, 864, 866],
  threadless: [226, 318, 940, 760],
  stack: [220, 450, 800, 830],
  flat: [200, 480, 840, 760],
  spacerCap: [200, 420, 840, 800],
};
// Scale and move a drawing so its box is centred on (cx, cy) inside w × h.
function fit(svg, box, cx, cy, w, h, rot = 0) {
  const [x0, y0, x1, y1] = box;
  const s = Math.min(w / (x1 - x0), h / (y1 - y0));
  const bx = (x0 + x1) / 2, by = (y0 + y1) / 2;
  return `<g transform="translate(${cx - s * bx} ${cy - s * by}) scale(${s}) rotate(${rot} ${bx} ${by})">${svg}</g>`;
}

const S1 = () => stack(500, 720, 250, [[40, "brushed"], [80, "brushed"], [24, "brushed"]], 0.52);
const S2 = () => stack(500, 720, 280, [[40, "polished"], [80, "polished"], [24, "polished"]], 0.56);
const PRODUCT = {
  "quill-stem": [() => quill("raw"), BOX.quill],
  "threadless-stem": [() => threadless("green"), BOX.threadless],
  "spacer-1in": [S1, BOX.stack],
  "spacer-1-1-8in": [S2, BOX.stack],
  "flat-cap": [() => cap(500, 640, 300, "red"), BOX.flat],
  "spacer-cap": [() => cap(500, 690, 290, "ti", 110), BOX.spacerCap],
};
const P = (slug, ...a) => fit(PRODUCT[slug][0](), PRODUCT[slug][1], ...a);

const out = {};
const WIDE = ["spacer-cap", "spacer-1-1-8in", "spacer-1in"];
for (const slug of Object.keys(PRODUCT)) {
  out[`shop/${slug}.svg`] = doc(1200, 1200, P(slug, 600, 620, 820, 760));
  // Wide collage tiles show only the middle half of the height, so the product stays inside it. The stems turn a little.
  const tile = doc(1200, 1200, P(slug, 600, 600, 860, 560, slug.includes("stem") ? -4 : 0));
  out[`home/collage-${slug}.svg`] = tile;
  // These workshop tiles span two columns (2.7:1 on desktop, about square on a phone). A 2:1 image with the
  // product in its middle square fits both.
  out[`workshop/collage-${slug}.svg`] = WIDE.includes(slug) ? doc(1600, 800, P(slug, 800, 400, 680, 440)) : tile;
}

// Home hero: the text is on the left and at the bottom, so the products go to the right and up.
out["home/hero-stems.svg"] = doc(1600, 900, P("quill-stem", 980, 420, 540, 660) + P("threadless-stem", 1290, 520, 600, 470));
out["home/hero-spacers.svg"] = doc(1600, 900, P("spacer-1in", 990, 450, 500, 380) + fit(stack(500, 720, 280, [[30, "polished"], [60, "green"], [24, "polished"], [44, "red"]], 0.56), BOX.stack, 1320, 520, 520, 420));
out["home/hero-caps.svg"] = doc(1600, 900, P("spacer-cap", 1000, 430, 520, 380) + P("flat-cap", 1330, 570, 500, 300));

// Home categories (4:3).
out["home/category-stems.svg"] = doc(1200, 900, P("quill-stem", 400, 450, 440, 600) + P("threadless-stem", 800, 520, 520, 380));
out["home/category-spacers.svg"] = doc(1200, 900, P("spacer-1in", 380, 470, 440, 340) + P("spacer-1-1-8in", 820, 520, 480, 360));
out["home/category-caps.svg"] = doc(1200, 900, P("spacer-cap", 390, 450, 460, 340) + P("flat-cap", 820, 560, 440, 260));

// Workshop bench with parts, for the news block and the workshop hero.
const bench = (w, h, y) => `<rect x="0" y="${y}" width="${w}" height="${h - y}" fill="url(#bench)"/><rect x="0" y="${y}" width="${w}" height="4" fill="#fff" opacity="0.5"/>`;
out["home/news.svg"] = doc(1200, 900, bench(1200, 900, 600) + P("quill-stem", 330, 420, 400, 520) + P("spacer-cap", 740, 600, 300, 200) + P("spacer-1-1-8in", 1000, 640, 260, 190));
out["workshop/hero.svg"] = doc(1600, 900, bench(1600, 900, 680) + P("quill-stem", 1150, 430, 560, 640, -6));

// Workshop process steps (4:3).
const stock = (f) => `${shadow(560, 640, 420, 30)}
  <rect x="120" y="420" width="420" height="180" rx="14" fill="url(#flat-${f})"/>
  <rect x="530" y="455" width="260" height="110" rx="10" fill="url(#flat-${f})"/>
  <rect x="780" y="475" width="120" height="70" rx="8" fill="url(#flat-${f})"/>
  ${[150, 200, 250, 300, 350, 400, 450, 500].map((x) => `<line x1="${x}" y1="426" x2="${x}" y2="594" stroke="#000" stroke-opacity="0.06" stroke-width="3"/>`).join("")}
  <path d="M640 330 L760 330 L700 450 Z" fill="url(#flat-bolt)"/>
  <path d="M620 610 q20 -30 40 0 q20 30 40 0" stroke="#a9adb1" stroke-width="6" fill="none"/>
  <path d="M700 640 q15 -25 30 0 q15 25 30 0" stroke="#a9adb1" stroke-width="5" fill="none"/>`;
const mill = `${shadow(520, 700, 400, 34)}
  <path d="M200 520 L520 420 L840 520 L520 620 Z" fill="url(#top-brushed)"/>
  <path d="M200 520 L520 620 L520 700 L200 600 Z" fill="url(#flat-brushed)"/>
  <path d="M520 620 L840 520 L840 600 L520 700 Z" fill="url(#cyl-brushed)"/>
  <path d="M400 520 L520 482 L640 520 L520 558 Z" fill="url(#hole)"/>
  <rect x="490" y="150" width="60" height="300" rx="6" fill="url(#cyl-polished)"/>
  ${[180, 220, 260, 300, 340, 380, 420].map((y) => `<line x1="490" y1="${y}" x2="550" y2="${y + 24}" stroke="#000" stroke-opacity="0.35" stroke-width="5"/>`).join("")}
  <rect x="470" y="90" width="100" height="70" rx="8" fill="url(#cyl-bolt)"/>`;
const sparkle = (x, y, s) => `<path d="M${x} ${y - s} L${x + s * 0.18} ${y - s * 0.18} L${x + s} ${y} L${x + s * 0.18} ${y + s * 0.18} L${x} ${y + s} L${x - s * 0.18} ${y + s * 0.18} L${x - s} ${y} L${x - s * 0.18} ${y - s * 0.18} Z" fill="#fff"/>`;
out["workshop/process-turned.svg"] = doc(1200, 900, fit(stock("raw"), [120, 330, 1000, 670], 600, 470, 1000, 560));
out["workshop/process-milled.svg"] = doc(1200, 900, fit(mill, [120, 90, 920, 734], 600, 450, 900, 720));
out["workshop/process-finished.svg"] = doc(1200, 900, fit(threadless("polished") + sparkle(470, 300, 50) + sparkle(860, 300, 34) + sparkle(330, 690, 28), [226, 250, 960, 760], 600, 450, 960, 680));

// Bespoke (portrait 4:5): each part in its custom form.
out["bespoke/stems.svg"] = doc(1200, 1500, P("threadless-stem", 600, 760, 1000, 900));
out["bespoke/spacers.svg"] = doc(1200, 1500, fit(stack(500, 780, 270, [[30, "polished"], [70, "green"], [24, "brushed"], [50, "red"], [24, "polished"], [40, "black"]], 0.56), [200, 380, 820, 880], 600, 760, 900, 900));
out["bespoke/caps.svg"] = doc(1200, 1500, P("spacer-cap", 600, 760, 900, 800));

for (const [path, svg] of Object.entries(out)) writeFileSync(new URL(path, IMAGES), svg);
console.log(Object.keys(out).length, "files");
