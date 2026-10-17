"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { compareStems, stemPoints, steererUp, type Point, type Stem } from "@/lib/stem";
import styles from "./StemCalculator.module.css";

// The same blue and red as the paint colours on the bespoke page.
const BLUE = "#2f5fa8";
const RED = "#b3262d";

// The defaults are the same as on the MyVeloFit stem calculator, which this tool is based on.
const DEFAULT_HEAD_ANGLE = 73;
const DEFAULT_BLUE: Stem = { length: 100, angle: -7, spacers: 20 };
const DEFAULT_RED: Stem = { length: 90, angle: 7, spacers: 20 };

const HEAD_ANGLE = { min: 65, max: 80, step: 0.5 };
const LENGTH = { min: 40, max: 150, step: 1 };
const ANGLE = { min: -40, max: 40, step: 1 };
const SPACERS = { min: 0, max: 50, step: 1 };

// The drawing uses 1 unit per mm. This box holds the extreme slider positions (with the dots and
// line widths), so the drawing does not move or change scale when a slider moves.
const VIEW = { x: -35, y: -205, width: 200, height: 325 };
const HEAD_TUBE = 110;

type Range = { min: number; max: number; step: number };

function Slider({ label, unit, value, range, onChange }: { label: string; unit: string; value: number; range: Range; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className={styles.field}>
      <div className={styles.fieldHead}>
        <label className="meta" htmlFor={id}>
          {label}
        </label>
        <output className="meta-b" htmlFor={id}>
          {value} {unit}
        </output>
      </div>
      <input id={id} className={styles.range} type="range" {...range} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function StemFields({ name, color, stem, onChange }: { name: string; color: string; stem: Stem; onChange: (s: Stem) => void }) {
  return (
    <fieldset className={styles.group}>
      {/* The stem colour is data, so it stays inline. */}
      <legend className={cx("subheading", styles.legend)} style={{ color }}>
        {name}
      </legend>
      <Slider label="Stem length" unit="mm" value={stem.length} range={LENGTH} onChange={(length) => onChange({ ...stem, length })} />
      <Slider label="Stem angle" unit="°" value={stem.angle} range={ANGLE} onChange={(angle) => onChange({ ...stem, angle })} />
      <Slider label="Headset spacers" unit="mm" value={stem.spacers} range={SPACERS} onChange={(spacers) => onChange({ ...stem, spacers })} />
    </fieldset>
  );
}

// SVG y points down, so flip the y of each point.
const svg = (p: Point) => ({ x: p.x, y: -p.y });

function Drawing({ headAngle, blue, red, label }: { headAngle: number; blue: Stem; red: Stem; label: string }) {
  const up = steererUp(headAngle);
  const headTubeEnd = svg({ x: -up.x * HEAD_TUBE, y: -up.y * HEAD_TUBE });
  const spacerTop = svg({ x: up.x * Math.max(blue.spacers, red.spacers), y: up.y * Math.max(blue.spacers, red.spacers) });
  const stems = [
    { stem: red, color: RED },
    { stem: blue, color: BLUE },
  ];

  return (
    <svg className={styles.drawing} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`} role="img" aria-label={label}>
      <line className={styles.headTube} x1={0} y1={0} x2={headTubeEnd.x} y2={headTubeEnd.y} />
      <line className={styles.spacers} x1={0} y1={0} x2={spacerTop.x} y2={spacerTop.y} />
      {stems.map(({ stem, color }) => {
        const { clamp, bar } = stemPoints(headAngle, stem);
        const a = svg(clamp);
        const b = svg(bar);
        return (
          <g key={color} stroke={color} fill={color}>
            <line className={styles.stem} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <circle cx={b.x} cy={b.y} r={8} stroke="none" />
          </g>
        );
      })}
    </svg>
  );
}

const mm = (v: number) => `${Math.abs(v).toFixed(1)}mm`;
// Values that round to 0.0 are the same.
const same = (v: number) => Math.abs(v) < 0.05;

function Result({ higher, longer }: { higher: number; longer: number }) {
  if (same(higher) && same(longer)) return <>The two stems put the handlebar in the same position.</>;
  const height = <><strong>{mm(higher)}</strong> {higher > 0 ? "higher" : "lower"}</>;
  const reach = <><strong>{mm(longer)}</strong> {longer > 0 ? "longer" : "shorter"}</>;
  if (same(higher)) return <>Stem 1 is {reach} than stem 2, at the same height.</>;
  if (same(longer)) return <>Stem 1 is {height} than stem 2, with the same reach.</>;
  return <>Stem 1 is {height} and {reach} than stem 2.</>;
}

type Props = { open: boolean; onClose: () => void };

// Compare two stems and see how the handlebar position changes. It opens as a modal dialog.
export function StemCalculator({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [headAngle, setHeadAngle] = useState(DEFAULT_HEAD_ANGLE);
  const [blue, setBlue] = useState(DEFAULT_BLUE);
  const [red, setRed] = useState(DEFAULT_RED);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    // Stop the page behind the dialog from scrolling.
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = overflow;
    };
  }, [open]);

  const { higher, longer } = compareStems(headAngle, blue, red);

  return (
    // Escape closes a modal dialog and sends "close". A click on the backdrop has the dialog as its target.
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 id={titleId} className="meta-b">
            Stem calculator
          </h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.view}>
            {/* The result below gives the same information as text. */}
            <Drawing headAngle={headAngle} blue={blue} red={red} label="Side view of stem 1 and stem 2 on the steerer" />
            <p className={cx("body-copy", styles.result)} aria-live="polite">
              <Result higher={higher} longer={longer} />
            </p>
          </div>

          <div className={styles.controls}>
            <p className="body-copy muted">Compare two stems. See how the length, angle and spacers move your handlebar.</p>
            <Slider label="Headtube angle" unit="°" value={headAngle} range={HEAD_ANGLE} onChange={setHeadAngle} />
            <StemFields name="Stem 1" color={BLUE} stem={blue} onChange={setBlue} />
            <StemFields name="Stem 2" color={RED} stem={red} onChange={setRed} />
          </div>
        </div>
      </div>
    </dialog>
  );
}
