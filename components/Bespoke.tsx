"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { addToBag, bespokeBagItem } from "@/lib/bag";
import { ANGLES, BASE_PRICE, BONDS, CUSTOM_RANGE, DEFAULTS, FINISHES, HEIGHTS, LENGTHS, MATERIALS, PART_IDS, TYPES, type PartId } from "@/data/bespoke";
import { parseBespoke, sizeOf, type BespokeConfig } from "@/lib/bespoke";
import { cx } from "@/lib/cx";
import { gbp } from "@/lib/money";
import { minClampHeightMm } from "@/lib/stem-geometry";
import { FIRST_STEM, stemParams, type StemParams } from "@/lib/stem-model";
import layout from "@/styles/layout.module.css";
import styles from "./Bespoke.module.css";
import { Photo } from "./Photo";
import { StemCalculator } from "./StemCalculator";
import button from "./ui/button.module.css";

// The 3D part (three.js) loads only on the browser, after the page shows.
const StemModel = dynamic(() => import("./StemModel").then((m) => m.StemModel), { ssr: false });

const PARTS: { id: PartId; label: string; image: string; headline: string; body: string }[] = [
  { id: "stems", label: "Stems", image: "/images/bespoke/stems.jpg", headline: "Your length. Your angle. Your finish.", body: "Choose quill or threadless, set the reach, rise and clamp, choose a finish. We machine it to order." },
  { id: "spacers", label: "Spacers", image: "/images/bespoke/spacers.jpg", headline: "Your stack, to the millimetre.", body: "Choose your steerer size, set each spacer height, choose a finish per piece and mix colours across the stack." },
  { id: "caps", label: "Caps", image: "/images/bespoke/caps.jpg", headline: "Your cap. Your mark.", body: "Choose a flat cap or a spacer cap, pick a finish." },
];

function isPart(id: string): id is PartId {
  return PART_IDS.includes(id as PartId);
}

type ChipsProps = { label: React.ReactNode; options: string[]; value: string; onPick: (v: string) => void; isLocked?: (v: string) => boolean };

// A row of chips is a group named by its label, so a chip such as "60 mm" is clear (a height or a length).
function Chips({ label, options, value, onPick, isLocked }: ChipsProps) {
  const id = useId();
  return (
    <div className={cx(layout.stack, layout.gap12)} role="group" aria-labelledby={id}>
      <span className="meta-b" id={id}>
        {label}
      </span>
      <div className={styles.chips}>
        {options.map((o) => {
          const locked = isLocked?.(o) ?? false;
          return (
            <button key={o} type="button" className={styles.chip} disabled={locked} aria-pressed={o === value && !locked} onClick={() => onPick(o)}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// A slider for a custom size, between the limits in data/bespoke.json. The value shows beside the label.
// The limits are not written: the slider ends show them.
function SizeSlider({ label, unit, value, min, max, step = 1, onChange }: { label: string; unit: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  const id = useId();
  const show = (v: number) => (unit === "°" ? `${v}°` : `${v} ${unit}`);
  return (
    <div className={styles.slider}>
      <div className={styles.sliderHead}>
        <label className="meta" htmlFor={id}>
          {label}
        </label>
        <output className="meta-b" htmlFor={id}>
          {show(value)}
        </output>
      </div>
      <input id={id} className={styles.range} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function Bespoke() {
  const [part, setPart] = useState<PartId>("stems");
  const [material, setMaterial] = useState(DEFAULTS.material);
  const [bond, setBond] = useState(DEFAULTS.bond);
  const [types, setTypes] = useState<Record<PartId, string>>({ stems: TYPES.stems.initial, spacers: TYPES.spacers.initial, caps: TYPES.caps.initial });
  const [heights, setHeights] = useState<Record<PartId, string>>({ stems: HEIGHTS.stems.initial, spacers: HEIGHTS.spacers.initial, caps: HEIGHTS.caps.initial });
  const [length, setLength] = useState(DEFAULTS.length);
  const [angle, setAngle] = useState(DEFAULTS.angle);
  const [finish, setFinish] = useState(DEFAULTS.finish);
  // The custom sizes, which the customer sets with sliders. A slider starts at the chip that was picked
  // before it.
  const [sizes, setSizes] = useState({ length: sizeOf(DEFAULTS.length), angle: sizeOf(DEFAULTS.angle) });
  const [customHeights, setCustomHeights] = useState<Record<PartId, number>>({
    stems: sizeOf(HEIGHTS.stems.initial),
    spacers: sizeOf(HEIGHTS.spacers.initial),
    caps: sizeOf(HEIGHTS.caps.initial),
  });
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  // The key of the part that was added last, so the message goes when the options change.
  const [addedKey, setAddedKey] = useState<string | null>(null);
  // The look of the 3D part (stem, spacer or cap). The photo shows when the browser has no WebGL.
  const [stem, setStem] = useState<StemParams>(FIRST_STEM);
  const [noWebgl, setNoWebgl] = useState(false);

  // The URL hash (#stems, #spacers or #caps) selects the part.
  useEffect(() => {
    const readHash = () => {
      const id = window.location.hash.slice(1);
      if (isPart(id)) {
        setPart(id);
        window.scrollTo(0, 0);
      }
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  const bp = PARTS.find((p) => p.id === part) ?? PARTS[0];
  const isStem = part === "stems";
  // Brazing is steel only, so other materials are always welded.
  const bondLocked = material !== "Steel";
  const height = HEIGHTS[part];
  const type = TYPES[part];
  // A flat cap has no integrated spacer, so it has no height to choose.
  const hasHeight = !(part === "caps" && types.caps === "Flat cap");

  // The order that the options make.
  const stemAngle = angle === "Custom" ? `${sizes.angle}°` : angle;
  // A threadless steerer clamp must be tall enough for the angle. The lower heights are locked, the page moves a
  // locked height up to the lowest height that fits, and the height slider starts at that height.
  const angleNum = sizeOf(stemAngle);
  const minHeight = isStem && types.stems === "Threadless" && Number.isFinite(angleNum) ? minClampHeightMm(angleNum) : null;
  const heightMin = Math.max(CUSTOM_RANGE.height.stems[0], minHeight ?? 0);
  // The lowest custom height of each part. A stem needs at least the height for its angle.
  const heightFloor = isStem ? heightMin : CUSTOM_RANGE.height[part][0];
  const customHeight = Math.max(customHeights[part], heightFloor);
  const partHeight = heights[part] === "Custom" ? `${customHeight} mm` : heights[part];
  const draft: BespokeConfig = {
    part,
    type: types[part],
    material,
    finish,
    ...(hasHeight && { height: partHeight }),
    ...(isStem && {
      bond: bondLocked ? "Welded" : bond,
      length: length === "Custom" ? `${sizes.length} mm` : length,
      angle: stemAngle,
    }),
  };
  const draftKey = JSON.stringify(draft);
  useEffect(() => {
    setStem((before) => stemParams(JSON.parse(draftKey), before));
  }, [draftKey]);
  const heightLocked = (v: string) => minHeight !== null && v !== "Custom" && sizeOf(v) < minHeight;
  useEffect(() => {
    if (!heightLocked(heights.stems)) return;
    const fit = HEIGHTS.stems.options.find((o) => !heightLocked(o));
    if (fit) setHeights((h) => ({ ...h, stems: fit }));
    // heightLocked reads minHeight, which follows the angle and the type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minHeight, heights.stems]);
  const tooShort = minHeight !== null && draft.height !== undefined && sizeOf(draft.height) < minHeight;

  const config = parseBespoke(draft);
  const item = config && bespokeBagItem(config);
  // The limits of the custom sizes that the customer chose, for the message when one is not valid.
  const limits = [
    tooShort && `height of at least ${minHeight} mm for a ${draft.angle} angle`,
  ].filter(Boolean);

  return (
    <main>
      <div className={cx("meta", layout.ruleB, styles.tabs)}>
        <span className={cx(layout.ruleR, styles.tabsLabel)}>Customise</span>
        {PARTS.map((p) => (
          <button key={p.id} type="button" className={cx("meta", styles.tab)} aria-pressed={p.id === part} onClick={() => setPart(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      <section id="configure" className={cx(layout.grid2, layout.ruleB)}>
        <div className={styles.photo}>
          {!noWebgl ? (
            <StemModel
              params={stem}
              label={
                stem.part === "stems"
                  ? `3D view of the stem: ${stem.type.toLowerCase()}, ${stem.lengthMm} mm long, ${stem.heightMm} mm steerer clamp, ${stem.riseDeg}° rise. Drag to turn it.`
                  : stem.part === "spacers"
                    ? `3D view of the spacer: ${stem.spacerSize} steerer, ${stem.partHeightMm} mm high. Drag to turn it.`
                    : `3D view of the cap: ${stem.capType.toLowerCase()}${stem.capType === "Spacer cap" ? `, ${stem.partHeightMm} mm integrated spacer` : ""}. Drag to turn it.`
              }
              onFail={() => setNoWebgl(true)}
            />
          ) : (
            <Photo src={bp.image} alt={`Bespoke ${bp.label.toLowerCase()}`} sizes="(max-width: 767px) 100vw, 50vw" fill />
          )}
        </div>

        <div className={cx(layout.stack, layout.gap36, styles.options)}>
          <div className={cx(layout.stack, layout.gap12)}>
            <span className="meta-b">
              Bespoke {bp.label} · From {gbp(BASE_PRICE[part])}
            </span>
            <h2 className="heading">{bp.headline}</h2>
            <p className="body-copy muted">{bp.body}</p>
          </div>

          <Chips label={type.label} options={type.options} value={types[part]} onPick={(v) => setTypes((t) => ({ ...t, [part]: v }))} />

          <Chips label="Material" options={MATERIALS} value={material} onPick={setMaterial} />

          {isStem && (
            <Chips
              label={
                <>
                  Bonding method
                  {bondLocked && <span className={styles.lockNote}> — brazing is steel only</span>}
                </>
              }
              options={BONDS}
              value={bondLocked ? "Welded" : bond}
              onPick={setBond}
              isLocked={(v) => bondLocked && v === "Brazed"}
            />
          )}

          <div className={cx(layout.stack, layout.gap12)}>
            <Chips label={`Finish — ${finish}`} options={FINISHES} value={finish} onPick={setFinish} />
          </div>

          {hasHeight && (
            <div className={cx(layout.stack, layout.gap12)}>
              <Chips
                label={
                  <>
                    {height.label}
                    {part === "stems" && (HEIGHTS.stems.options.some(heightLocked) || tooShort) && (
                      <span className={styles.lockNote}>
                        {" "}
                        — at least {minHeight} mm for a {draft.angle} angle
                      </span>
                    )}
                  </>
                }
                options={height.options}
                value={heights[part]}
                onPick={(v) => {
                  if (v === "Custom" && heights[part] !== "Custom") setCustomHeights((c) => ({ ...c, [part]: sizeOf(heights[part]) }));
                  setHeights((h) => ({ ...h, [part]: v }));
                }}
                isLocked={part === "stems" ? heightLocked : undefined}
              />
              {heights[part] === "Custom" && (
                // Spacers and caps come in half millimetres, stems in whole millimetres.
                <SizeSlider
                  label="Custom height"
                  unit="mm"
                  value={customHeight}
                  min={heightFloor}
                  max={CUSTOM_RANGE.height[part][1]}
                  step={isStem ? 1 : 0.5}
                  onChange={(v) => setCustomHeights((c) => ({ ...c, [part]: v }))}
                />
              )}
            </div>
          )}

          {isStem && (
            <div className={cx(layout.stack, layout.gap12)}>
              <Chips
                label="Length"
                options={LENGTHS}
                value={length}
                onPick={(v) => {
                  if (v === "Custom" && length !== "Custom") setSizes((z) => ({ ...z, length: sizeOf(length) }));
                  setLength(v);
                }}
              />
              {length === "Custom" && (
                <SizeSlider
                  label="Custom length"
                  unit="mm"
                  value={sizes.length}
                  min={CUSTOM_RANGE.length[0]}
                  max={CUSTOM_RANGE.length[1]}
                  onChange={(v) => setSizes((z) => ({ ...z, length: v }))}
                />
              )}
            </div>
          )}

          {isStem && (
            <div className={cx(layout.stack, layout.gap12)}>
              <Chips
                label="Angle"
                options={ANGLES}
                value={angle}
                onPick={(v) => {
                  if (v === "Custom" && angle !== "Custom") setSizes((z) => ({ ...z, angle: sizeOf(angle) }));
                  setAngle(v);
                }}
              />
              {angle === "Custom" && (
                <SizeSlider
                  label="Custom angle"
                  unit="°"
                  value={sizes.angle}
                  min={CUSTOM_RANGE.angle[0]}
                  max={CUSTOM_RANGE.angle[1]}
                  onChange={(v) => setSizes((z) => ({ ...z, angle: v }))}
                />
              )}
            </div>
          )}

          {isStem && (
            <div className={cx(layout.stack, layout.gap12)}>
              <span className="meta-b">Not sure about length and angle?</span>
              <button type="button" className={cx(button.button, button.outline)} aria-haspopup="dialog" onClick={() => setCalculatorOpen(true)}>
                Stem calculator
              </button>
            </div>
          )}

          <div className={cx(layout.stack, layout.gap12, layout.ruleT, styles.buy)}>
            <div className={layout.between}>
              <span className="meta-b">Your price</span>
              <span className="subheading">{item ? gbp(item.price) : "—"}</span>
            </div>
            <button
              type="button"
              className={cx(button.button, button.block)}
              disabled={!item}
              onClick={() => {
                if (!item) return;
                addToBag(item);
                setAddedKey(item.key);
              }}
            >
              Add to bag
            </button>
            <span className="meta muted" role="status">
              {!item ? (
                `Choose a size inside the limits: ${limits.join(", ")}.`
              ) : addedKey === item.key ? (
                <>
                  Added to your bag. <Link className="link-u" href="/bag">View bag</Link>
                </>
              ) : (
                "Made to order. Ships in 3–4 weeks."
              )}
            </span>
          </div>
        </div>
      </section>

      <StemCalculator open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </main>
  );
}
