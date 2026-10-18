"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { addToBag, bespokeBagItem } from "@/lib/bag";
import {
  ANGLES,
  BASE_PRICE,
  BONDS,
  COLORS,
  CUSTOM_RANGE,
  FINISHES,
  HEIGHTS,
  LENGTHS,
  MATERIALS,
  parseBespoke,
  PART_IDS,
  TYPES,
  type BespokeConfig,
  type PartId,
} from "@/lib/bespoke";
import { cx } from "@/lib/cx";
import { gbp } from "@/lib/money";
import layout from "@/styles/layout.module.css";
import styles from "./Bespoke.module.css";
import { Photo } from "./Photo";
import { StemCalculator } from "./StemCalculator";
import button from "./ui/button.module.css";

const PARTS: { id: PartId; label: string; image: string; headline: string; body: string }[] = [
  { id: "stems", label: "Stems", image: "/images/bespoke/stems.svg", headline: "Your length. Your angle. Your finish.", body: "Choose quill or threadless, set the reach, rise and clamp, choose a finish. We machine it to order." },
  { id: "spacers", label: "Spacers", image: "/images/bespoke/spacers.svg", headline: "Your stack, to the millimetre.", body: "Choose your steerer size, set each spacer height, choose a finish per piece and mix colours across the stack." },
  { id: "caps", label: "Caps", image: "/images/bespoke/caps.svg", headline: "Your cap. Your mark.", body: "Choose a flat cap or a spacer cap, pick a finish." },
];

function isPart(id: string): id is PartId {
  return PART_IDS.includes(id as PartId);
}

type ChipsProps = { label: React.ReactNode; options: string[]; value: string; onPick: (v: string) => void; isLocked?: (v: string) => boolean };

function Chips({ label, options, value, onPick, isLocked }: ChipsProps) {
  return (
    <div className={cx(layout.stack, layout.gap12)}>
      <span className="meta-b">{label}</span>
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

function CustomInput({ placeholder, unit, value, onChange }: { placeholder: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.custom}>
      <input className={styles.customInput} type="number" min={0} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="meta">{unit}</span>
    </div>
  );
}

export function Bespoke() {
  const [part, setPart] = useState<PartId>("stems");
  const [material, setMaterial] = useState("Steel");
  const [bond, setBond] = useState("Brazed");
  const [types, setTypes] = useState<Record<PartId, string>>({ stems: TYPES.stems.initial, spacers: TYPES.spacers.initial, caps: TYPES.caps.initial });
  const [heights, setHeights] = useState<Record<PartId, string>>({ stems: HEIGHTS.stems.initial, spacers: HEIGHTS.spacers.initial, caps: HEIGHTS.caps.initial });
  const [length, setLength] = useState("90 mm");
  const [angle, setAngle] = useState("±6°");
  const [finish, setFinish] = useState("Painted");
  const [color, setColor] = useState("Green");
  const [custom, setCustom] = useState({ height: "", length: "", angle: "" });
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  // The key of the part that was added last, so the message goes when the options change.
  const [addedKey, setAddedKey] = useState<string | null>(null);

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

  // The order that the options make. A custom size is a number that the customer types, so it can be
  // wrong: parseBespoke then gives null and the button stays off.
  const customValue = (v: string, unit: string) => (v.trim() === "" ? "" : `${Number(v)}${unit}`);
  const draft: BespokeConfig = {
    part,
    type: types[part],
    material,
    finish,
    ...(finish === "Painted" && { color }),
    ...(hasHeight && { height: heights[part] === "Custom" ? customValue(custom.height, " mm") : heights[part] }),
    ...(isStem && {
      bond: bondLocked ? "Welded" : bond,
      length: length === "Custom" ? customValue(custom.length, " mm") : length,
      angle: angle === "Custom" ? customValue(custom.angle, "°") : angle,
    }),
  };
  const config = parseBespoke(draft);
  const item = config && bespokeBagItem(config);
  // The limits of the custom sizes that the customer chose, for the message when one is not valid.
  const limits = [
    hasHeight && heights[part] === "Custom" && `height ${CUSTOM_RANGE.height[part].join("–")} mm`,
    isStem && length === "Custom" && `length ${CUSTOM_RANGE.length.join("–")} mm`,
    isStem && angle === "Custom" && `angle ${CUSTOM_RANGE.angle.join(" to ")}°`,
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

      <section id="configure" className={cx(layout.split75, layout.ruleB)}>
        <div className={cx(layout.ruleR, styles.photo)}>
          <Photo src={bp.image} alt={`Bespoke ${bp.label.toLowerCase()}`} sizes="(max-width: 767px) 100vw, 58vw" fill />
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
            <Chips label={`Finish — ${finish === "Painted" ? `Painted ${color}` : finish}`} options={FINISHES} value={finish} onPick={setFinish} />
            {finish === "Painted" && (
              <div className={styles.swatches}>
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={c.name === color}
                    className={styles.swatch}
                    // The swatch colour is data, so it stays inline.
                    style={{ background: c.hex }}
                    onClick={() => setColor(c.name)}
                  />
                ))}
              </div>
            )}
          </div>

          {hasHeight && (
            <div className={cx(layout.stack, layout.gap12)}>
              <Chips label={height.label} options={height.options} value={heights[part]} onPick={(v) => setHeights((h) => ({ ...h, [part]: v }))} />
              {heights[part] === "Custom" && (
                <CustomInput placeholder="e.g. 42" unit="mm" value={custom.height} onChange={(v) => setCustom((c) => ({ ...c, height: v }))} />
              )}
            </div>
          )}

          {isStem && (
            <div className={cx(layout.stack, layout.gap12)}>
              <Chips label="Length" options={LENGTHS} value={length} onPick={setLength} />
              {length === "Custom" && (
                <CustomInput placeholder="e.g. 95" unit="mm" value={custom.length} onChange={(v) => setCustom((c) => ({ ...c, length: v }))} />
              )}
            </div>
          )}

          {isStem && (
            <div className={cx(layout.stack, layout.gap12)}>
              <Chips label="Angle" options={ANGLES} value={angle} onPick={setAngle} />
              {angle === "Custom" && (
                <CustomInput placeholder="e.g. 12" unit="°" value={custom.angle} onChange={(v) => setCustom((c) => ({ ...c, angle: v }))} />
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
                `Enter a custom size inside the limits: ${limits.join(", ")}.`
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
