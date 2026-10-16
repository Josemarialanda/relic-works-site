"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import layout from "@/styles/layout.module.css";
import styles from "./Bespoke.module.css";
import { Placeholder } from "./Placeholder";

const PARTS = [
  { id: "stems", label: "Stems", base: 220, headline: "Your length. Your angle. Your finish.", body: "Set the reach, rise and clamp, choose a finish. We machine it to order." },
  { id: "spacers", label: "Spacers", base: 30, headline: "Your stack, to the millimetre.", body: "Set each spacer height, choose a finish per piece and mix colours across the stack." },
  { id: "caps", label: "Caps", base: 40, headline: "Your cap. Your mark.", body: "Choose a profile and texture, pick a finish." },
] as const;

type PartId = (typeof PARTS)[number]["id"];

const HEIGHTS: Record<PartId, { label: string; options: string[]; initial: string }> = {
  stems: { label: "Height", options: ["35 mm", "40 mm", "45 mm", "50 mm", "Custom"], initial: "40 mm" },
  spacers: { label: "Height", options: ["2.5 mm", "5 mm", "10 mm", "15 mm", "20 mm", "Custom"], initial: "10 mm" },
  caps: { label: "Integrated spacer height", options: ["0 mm", "5 mm", "10 mm", "15 mm", "Custom"], initial: "5 mm" },
};

const MATERIALS = ["Steel", "Titanium", "Aluminium"];
const BONDS = ["Brazed", "Welded"];
const FINISHES = ["Raw", "Brushed", "Painted", "Polished"];
const LENGTHS = ["60 mm", "75 mm", "90 mm", "110 mm", "130 mm", "Custom"];
const ANGLES = ["±6°", "±17°", "±25°", "±35°", "Custom"];
const COLORS = [
  { name: "Blue", hex: "#2f5fa8" },
  { name: "Red", hex: "#b3262d" },
  { name: "Orange", hex: "#d9661f" },
  { name: "Gold", hex: "#c9a24a" },
  { name: "Green", hex: "#1f7a3d" },
];

function isPart(id: string): id is PartId {
  return PARTS.some((p) => p.id === id);
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
  const [heights, setHeights] = useState<Record<PartId, string>>({ stems: HEIGHTS.stems.initial, spacers: HEIGHTS.spacers.initial, caps: HEIGHTS.caps.initial });
  const [length, setLength] = useState("90 mm");
  const [angle, setAngle] = useState("±6°");
  const [finish, setFinish] = useState("Painted");
  const [color, setColor] = useState("Green");
  const [custom, setCustom] = useState({ height: "", length: "", angle: "" });

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
          <Placeholder label={`${bp.label} photo to come`} fill />
        </div>

        <div className={cx(layout.stack, layout.gap36, styles.options)}>
          <div className={cx(layout.stack, layout.gap12)}>
            <span className="meta-b">
              Bespoke {bp.label} · From £{bp.base}
            </span>
            <h2 className="heading">{bp.headline}</h2>
            <p className="body-copy muted">{bp.body}</p>
          </div>

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

          <div className={cx(layout.stack, layout.gap12)}>
            <Chips label={height.label} options={height.options} value={heights[part]} onPick={(v) => setHeights((h) => ({ ...h, [part]: v }))} />
            {heights[part] === "Custom" && (
              <CustomInput placeholder="e.g. 42" unit="mm" value={custom.height} onChange={(v) => setCustom((c) => ({ ...c, height: v }))} />
            )}
          </div>

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
        </div>
      </section>
    </main>
  );
}
