"""Draws the Relic Works logo as SVG files with the letters as outlines (paths), so the logo does not
need a font on the visitor's device. The letters come from the Inter font (the font of the site), except
the first letter of each word (the "R" and the "W"), which is a blackletter (medieval) capital from UnifrakturCook. Both fonts are free to use
(SIL Open Font License).

Files (in public/images/brand/):
  logo.svg, logo-white.svg                 one line, for the navigation and the footer
  logo-stacked.svg, logo-stacked-white.svg  two lines with a hairline rule, for square spaces

Run it from the repo root. It needs Python with fontTools and uharfbuzz, and the two fonts:

  FONTS="$(nix build --no-link --print-out-paths nixpkgs#inter)/share/fonts/truetype/InterVariable.ttf"
  GOOGLE="$(nix build --impure --no-link --print-out-paths --expr 'with import <nixpkgs> {}; google-fonts.override { fonts = [ "UnifrakturCook" ]; }')"
  nix shell --impure --expr 'with import <nixpkgs> {}; python3.withPackages (p: [p.fonttools p.uharfbuzz])' \\
    -c python scripts/make-logo.py "$FONTS" "$GOOGLE/share/fonts/truetype/UnifrakturCook-Bold.ttf"
"""

import io
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = Path(__file__).resolve().parent.parent / "public" / "images" / "brand"

# The look of the logo. Tracking is in 1/1000 of the font size (em): a tight wordmark, like the poster
# text of the site.
WEIGHT = 700
TRACKING_ONE_LINE = -45
# The space between a blackletter capital and the next letter in the one-line logo, in 1/1000 em.
LEAD_GAP_ONE_LINE = 30
# The stacked logo is in capitals with open spacing, and both lines have the same width.
TRACKING_STACKED = 110
RULE = 0.045  # the thickness of the hairline rule, in em
GAP = 0.34  # the space above and below the rule, in em
# A letter at the start of a word comes from the blackletter font if it is one of these letters.
LEAD_CHARS = "RW"
# The blackletter has very thin strokes. This adds an outline to a letter, so its thinnest strokes get
# thicker (in font units, 2048 per em; the thinnest stroke of the font is about 25). A letter that is
# not in the list has no outline. The "W" looks good without one.
LEAD_STROKE = {"R": 50}


def load(path: str):
    font = instancer.instantiateVariableFont(TTFont(path), {"wght": WEIGHT, "opsz": 14})
    buf = io.BytesIO()
    font.save(buf)
    return font, hb.Font(hb.Face(buf.getvalue()))


class Lead:
    """The blackletter capitals. They have the height of the capitals of the main font. All the letters
    use the scale and the baseline shift of the "R", so they keep the proportions of the font."""

    def __init__(self, path: str, cap_height: float):
        self.font = TTFont(path)
        self.glyphs = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        ref = self._bounds("R")
        self.scale = cap_height / (ref[3] - ref[1])
        # The bottom of the "R" is on the baseline.
        self.shift = ref[1] * self.scale

    def _bounds(self, ch: str):
        pen = BoundsPen(self.glyphs)
        self.glyphs[self.cmap[ord(ch)]].draw(pen)
        return pen.bounds

    def pad(self, ch: str) -> float:
        """The outline goes out by half of the stroke width on each side."""
        return LEAD_STROKE.get(ch, 0) / 2

    def width(self, ch: str) -> float:
        b = self._bounds(ch)
        return (b[2] - b[0]) * self.scale + 2 * self.pad(ch)

    def box(self, ch: str, ox: float, baseline: float):
        """The bounds of the letter with its outline."""
        b = self._bounds(ch)
        top = baseline + self.shift - b[3] * self.scale
        bottom = baseline + self.shift - b[1] * self.scale
        return (ox, top - self.pad(ch), ox + self.width(ch), bottom + self.pad(ch))

    def draw(self, pen, ch: str, ox: float, baseline: float):
        x0 = self._bounds(ch)[0]
        # SVG y points down.
        t = (self.scale, 0, 0, -self.scale, ox + self.pad(ch) - x0 * self.scale, baseline + self.shift)
        self.glyphs[self.cmap[ord(ch)]].draw(TransformPen(pen, t))


def shape(hbfont, text: str, tracking: float):
    """Return (glyph id, x position) for each letter, with kerning, and the width of the run."""
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": False})
    x, out = 0, []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        out.append((info.codepoint, x + pos.x_offset))
        x += pos.x_advance + tracking
    # The tracking after the last letter is not part of the run.
    return out, x - tracking


def segments(text: str):
    """Split a line: each blackletter capital is one segment, and the other letters form runs."""
    out, run = [], ""
    for i, ch in enumerate(text):
        if ch in LEAD_CHARS and (i == 0 or text[i - 1] == " "):
            if run:
                out.append(("run", run))
                run = ""
            out.append(("lead", ch))
        else:
            run += ch
    if run:
        out.append(("run", run))
    return out


def layout(hbfont, lead: Lead, text: str, tracking: float, lead_gap: float):
    """The places of all the letters, and the width of the line."""
    x, items, gap = 0.0, [], 0.0
    for kind, value in segments(text):
        if kind == "lead":
            items.append(("lead", value, x))
            x += lead.width(value)
            gap = lead_gap
        else:
            placed, width = shape(hbfont, value, tracking)
            items += [("glyph", gid, x + gx) for gid, gx in placed]
            x += width
            gap = tracking
        x += gap
    return items, x - gap


def line_width(hbfont, lead: Lead, text: str, tracking: float, lead_gap: float) -> float:
    return layout(hbfont, lead, text, tracking, lead_gap)[1]


def line_paths(font, hbfont, lead: Lead, text: str, tracking: float, ox: float, baseline: float, lead_gap: float):
    """The path data of a line, with the origin at (ox, baseline). Returns the path data of the main font,
    the path data of the blackletter capitals (by outline width), and the bounds of the line."""
    glyphs = font.getGlyphSet()
    order = font.getGlyphOrder()
    pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    # One path for each outline width, because the width is a property of the path in SVG.
    lead_pens = {}
    bounds = BoundsPen(glyphs)
    boxes = []
    for kind, value, x in layout(hbfont, lead, text, tracking, lead_gap)[0]:
        if kind == "lead":
            stroke = LEAD_STROKE.get(value, 0)
            if stroke not in lead_pens:
                lead_pens[stroke] = SVGPathPen(lead.glyphs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
            lead.draw(lead_pens[stroke], value, ox + x, baseline)
            boxes.append(lead.box(value, ox + x, baseline))
        else:
            t = (1, 0, 0, -1, ox + x, baseline)
            glyphs[order[value]].draw(TransformPen(pen, t))
            glyphs[order[value]].draw(TransformPen(bounds, t))
    if bounds.bounds:
        boxes.append(bounds.bounds)
    box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    return pen.getCommands(), {s: pen_.getCommands() for s, pen_ in lead_pens.items()}, box


def paths(d: str, d_lead: dict) -> str:
    """The SVG for the path data. COLOR is replaced later."""
    out = f'<path fill="COLOR" d="{d}"/>'
    for stroke, data in d_lead.items():
        outline = f' stroke="COLOR" stroke-width="{stroke}" stroke-linejoin="round"' if stroke else ""
        out += f'<path fill="COLOR"{outline} d="{data}"/>'
    return out


def svg(box, body: str, color: str, height: int) -> str:
    """The viewBox is in font units. The width and height are the default size in pixels: CSS can change them."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.2f} {y0:.2f} {w:.2f} {h:.2f}" '
        f'width="{round(w / h * height)}" height="{height}" role="img" aria-label="Relic Works">'
        f'<title>Relic Works</title>{body.replace("COLOR", color)}</svg>\n'
    )


def main(inter_path: str, lead_path: str):
    font, hbfont = load(inter_path)
    em = font["head"].unitsPerEm
    cap = font["OS/2"].sCapHeight
    lead = Lead(lead_path, cap)

    # One line. The box is the exact outline of the letters, so CSS sets the size with the height.
    d, d_lead, box = line_paths(font, hbfont, lead, "Relic Works", TRACKING_ONE_LINE * em / 1000, 0, 0, LEAD_GAP_ONE_LINE * em / 1000)
    body = paths(d, d_lead)

    # Two lines (RELIC and WORKS) with a rule between them. Both lines get the same width: the
    # tracking of the shorter line is raised until the widths are equal.
    track = TRACKING_STACKED * em / 1000
    texts = ("RELIC", "WORKS")
    widths = [line_width(hbfont, lead, t, track, track) for t in texts]
    target = max(widths)
    lines, top = [], None
    for i, text in enumerate(texts):
        tr = track + (target - widths[i]) / (len(text) - 1)
        base = i * (cap + (2 * GAP + RULE) * em)
        d2, d2_lead, b2 = line_paths(font, hbfont, lead, text, tr, 0, base + cap, tr)
        lines.append(paths(d2, d2_lead))
        top = b2 if top is None else (min(top[0], b2[0]), min(top[1], b2[1]), max(top[2], b2[2]), max(top[3], b2[3]))
    rule_y = cap + GAP * em
    stacked = "".join(lines)
    stacked += f'<rect fill="COLOR" x="{top[0]:.2f}" y="{rule_y:.2f}" width="{top[2] - top[0]:.2f}" height="{RULE * em:.2f}"/>'

    for name, box_, body_, height in (("logo", box, body, 28), ("logo-stacked", top, stacked, 96)):
        for suffix, color in (("", "#000000"), ("-white", "#ffffff")):
            (OUT / f"{name}{suffix}.svg").write_text(svg(box_, body_, color, height))
            print(f"wrote {name}{suffix}.svg")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
