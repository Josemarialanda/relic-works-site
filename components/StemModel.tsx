"use client";

// A 3D stem that follows the options of the bespoke page. The parts are bodies of revolution with rounded edges,
// made from a profile that turns around an axis, so the metal catches the light as on a real part. Most parts are
// built once. Each frame moves them, and makes again only the few parts whose shape follows a size, so a change of
// option slides to its new value. The unit of the scene is the centimetre. The steerer is on the vertical axis, the
// body points along +x, and the handlebar is along z.

import { useEffect, useRef, type PointerEvent } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { JOINT_MARGIN_MM } from "@/lib/stem-geometry";
import type { StemParams } from "@/lib/stem-model";
import { useStillness } from "@/lib/useStillness";
import styles from "./StemModel.module.css";

// Sizes in cm, as on a real stem. The steerer clamp is for a 1 1/8" steerer (28.6 mm bore), the quill is 22.2 mm,
// and the handlebar is 31.8 mm.
const CLAMP_R = 1.9;
const BORE_R = 1.43;
const BODY_R = 1.7;
const BODY_END_R = 1.45;
const BAR_R = 1.59;
const QUILL_R = 1.11;
// The quill is this much longer than the "height" option.
const QUILL_EXTRA = 7;
// The slanted cut of the quill and its wedge: the angle of the cut, and its height above the bottom.
const CUT_TAN = Math.tan((50 * Math.PI) / 180);
const CUT_UP = 2.2;
const WEDGE_LOW = 1.2;
// The handlebar clamp: a ring in two parts. The face part is at the front, between the two splits. The splits are
// at the top and the bottom (±SPLIT_A from the front), on one vertical line, so that the bolts at the top are
// straight above the bolts at the bottom and all four are parallel. Two bosses, each with one bolt, cross each split.
const SPLIT_R = 2.1;
const SPLIT_W = 3.2;
const SPLIT_A = Math.PI / 2;
const SPLIT_GAP = 0.022;
// The bolt bosses: radius and length.
const BOSS_R = 0.42;
const BOSS_L = 1.9;
// A steerer clamp taller than this (in cm) has four bolts.
const TALL_CLAMP = 7;
// The number of points around a joint, and along the cross-section of a fillet.
const JOINT_N = 96;
const JOINT_M = 12;
// The view that the stem shows first: a three-quarter view of its side, a little from above.
const START_YAW = -0.3;
const ELEVATION = 0.28;
// A spacer and a cap show more of their top.
const PART_ELEVATION = 0.6;
// A spacer: its bore and its outer radius for each steerer size. A cap: the radius of its integrated spacer.
const SPACER: Record<string, { bore: number; outer: number }> = { '1"': { bore: 1.27, outer: 1.62 }, '1 1/8"': { bore: BORE_R, outer: 1.8 } };
const CAP_RING_R = 1.8;

type Stem = {
  part: string;
  spacerSize: string;
  capType: string;
  partHeight: number;
  length: number;
  height: number;
  rise: number;
  roughness: number;
  metalness: number;
  brushed: number;
  quill: number;
  welded: number;
  bodyK: number;
  color: THREE.Color;
};

const stemOf = (p: StemParams): Stem => ({
  part: p.part,
  spacerSize: p.spacerSize,
  capType: p.capType,
  partHeight: p.partHeightMm / 10,
  length: p.lengthMm / 10,
  height: p.heightMm / 10,
  rise: (p.riseDeg * Math.PI) / 180,
  roughness: p.roughness,
  metalness: p.metalness,
  brushed: p.brushed ? 1 : 0,
  quill: p.type === "Quill" ? 1 : 0,
  welded: p.bond === "Welded" ? 1 : 0,
  // The body of a quill stem is slimmer than the quill, as in the photo of a quill stem.
  bodyK: p.type === "Quill" ? 0.55 : 0.85,
  color: new THREE.Color(p.color),
});

// Fine lines along the part, for the finish "Brushed". The lines change across the part, not along it.
function brushTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 8;
  const x = c.getContext("2d")!;
  for (let i = 0; i < c.width; i++) {
    const v = 128 + (Math.random() - 0.5) * 120;
    x.fillStyle = `rgb(${v},${v},${v})`;
    x.fillRect(i, 0, 1, c.height);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

const HEAT = new THREE.Color(0x9a7a45);

// The ripples of a TIG weld. A weld is a row of overlapping half-moons. The bump map has bands across the bead, and
// each band bends, so that it is a half-moon. The texture repeats along the bead.
function weldTexture(): THREE.CanvasTexture {
  const w = 64;
  const h = 64;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  const img = x.createImageData(w, h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      // The bend across the bead: the middle of the bead is ahead of the edges.
      const across = py / h - 0.5;
      const phase = px / w + 0.28 * across * across * 4;
      const v = Math.round(127.5 + 127.5 * Math.sin(phase * Math.PI * 2));
      const i = (py * w + px) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(56, 1);
  return t;
}

// The points of a quarter of a circle, for a rounded corner of a profile.
function arc(out: THREE.Vector2[], cx: number, cy: number, r: number, a0: number, a1: number, n = 6) {
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
}

// The profile of a tube from y0 to y1, with rounded edges (`round` outside, `inner` at the bore). A bore of 0 gives a
// solid part. `roundTop` and `roundBottom` let the two ends have different edges. The order of the points makes
// the normals point out of the metal.
function profile(bore: number, outer: number, y0: number, y1: number, roundBottom: number, roundTop: number, inner = 0.03) {
  const p: THREE.Vector2[] = [];
  if (bore === 0) p.push(new THREE.Vector2(0, y0));
  arc(p, outer - roundBottom, y0 + roundBottom, roundBottom, -Math.PI / 2, 0);
  arc(p, outer - roundTop, y1 - roundTop, roundTop, 0, Math.PI / 2);
  if (bore === 0) {
    p.push(new THREE.Vector2(0, y1));
  } else {
    arc(p, bore + inner, y1 - inner, inner, Math.PI / 2, Math.PI, 3);
    arc(p, bore + inner, y0 + inner, inner, Math.PI, (3 * Math.PI) / 2, 3);
    p.push(p[0].clone());
  }
  return p;
}

// A part of a ring (around the y axis) from the angle `from` to the angle `to`, with flat ends. The angles are
// measured as for LatheGeometry. The profile must be the same above and below y = 0.
function ringPart(points: THREE.Vector2[], from: number, to: number, segments: number): THREE.BufferGeometry {
  const side = new THREE.LatheGeometry(points, segments, from, to - from);
  const shape = new THREE.Shape(points.slice(0, -1));
  const start = new THREE.ShapeGeometry(shape, 8).rotateY(from - Math.PI / 2);
  const end = new THREE.ShapeGeometry(shape, 8).rotateX(Math.PI).rotateY(to - Math.PI / 2);
  return mergeAll([side, start, end]);
}

// One geometry from several, with positions and normals only.
function mergeAll(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const count = parts.reduce((n, g) => n + g.getAttribute("position").count, 0);
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let at = 0;
  for (const g of parts) {
    const p = g.getAttribute("position");
    const n = g.getAttribute("normal");
    const u = g.getAttribute("uv");
    pos.set(p.array as Float32Array, at * 3);
    nor.set(n.array as Float32Array, at * 3);
    if (u) uv.set(u.array as Float32Array, at * 2);
    at += p.count;
  }
  list.forEach((g) => g.dispose());
  parts.forEach((g) => g.dispose());
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}

// A round boss along the y axis from 0 to `length`, rounded at the outer end only. Two of them, with a gap, make a
// boss that a split crosses.
const bossHalf = (length: number) => new THREE.LatheGeometry(profile(0, BOSS_R, 0, length, 0.03, 0.14), 64);

// A socket head screw along +y, with the head from 0 to 0.38 and a hex socket in its top.
function bolt(steel: THREE.Material, dark: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.LatheGeometry(profile(0, 0.34, 0, 0.38, 0.02, 0.06), 48), steel);
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 6), dark);
  socket.position.y = 0.375;
  head.castShadow = true;
  g.add(head, socket);
  return g;
}

// A cylinder whose bottom (`bottom`) or top (`top`) end is cut by the slanted plane y = c + x * CUT_TAN.
function slanted(r: number, y0: number, y1: number, cut: "bottom" | "top", c: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, 1, 96, 1, false);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const nor = g.getAttribute("normal") as THREE.BufferAttribute;
  const n = new THREE.Vector3(-CUT_TAN, 1, 0).normalize();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const top = pos.getY(i) > 0;
    const onCut = cut === "top" ? top : !top;
    pos.setY(i, onCut ? c + x * CUT_TAN : top ? y1 : y0);
    // The flat ends: the cut end faces along the normal of the plane.
    if (Math.abs(nor.getY(i)) > 0.5 && onCut) nor.setXYZ(i, cut === "top" ? n.x : -n.x, cut === "top" ? n.y : -n.y, 0);
  }
  return g;
}

type Props = {
  params: StemParams;
  label: string;
  // The browser has no WebGL: the page shows the photo instead.
  onFail: () => void;
};

export function StemModel({ params, label, onFail }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const still = useStillness();
  // The loop reads the newest values from these refs, so it starts only once.
  const target = useRef<Stem>(stemOf(params));
  const stillRef = useRef(still);
  const view = useRef({ yaw: START_YAW, drag: false, x: 0, dirty: true });

  useEffect(() => {
    target.current = stemOf(params);
    view.current.dirty = true;
  }, [params]);
  useEffect(() => {
    stillRef.current = still;
    view.current.dirty = true;
  }, [still]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch {
      onFail();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    // A soft shadow under the stem, as in a studio photo.
    renderer.shadowMap.type = THREE.VSMShadowMap;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envMap = pmrem.fromScene(room, 0.03).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 1;

    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(-10, 26, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 8;
    key.shadow.blurSamples = 10;
    key.shadow.camera.left = key.shadow.camera.bottom = -22;
    key.shadow.camera.right = key.shadow.camera.top = 22;
    key.shadow.camera.far = 90;
    key.shadow.bias = -0.0008;
    scene.add(key);
    // A light from behind draws a bright line along the top edges.
    const rim = new THREE.DirectionalLight(0xffffff, 0.7);
    rim.position.set(14, 10, -18);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d4cc, 0.35));

    const camera = new THREE.PerspectiveCamera(26, 1, 1, 600);

    const brush = brushTexture();
    // The bare metal. The finish changes its numbers.
    const skin = new THREE.MeshPhysicalMaterial({ bumpMap: brush, bumpScale: 0 });
    // The brass of a brazed joint is smooth and warm. The weld of a TIG joint has ripples (a bump map).
    const braze = new THREE.MeshStandardMaterial({ color: 0xb48a4a, metalness: 1, roughness: 0.34, side: THREE.DoubleSide });
    const ripple = weldTexture();
    const weld = new THREE.MeshStandardMaterial({ bumpMap: ripple, bumpScale: 0.9 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 1, roughness: 0.22 });
    const dark = new THREE.MeshBasicMaterial({ color: 0x0c0c0c });
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.22 });

    const geometries: THREE.BufferGeometry[] = [];
    const geo = <T extends THREE.BufferGeometry>(g: T): T => (geometries.push(g), g);
    const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => {
      const x = new THREE.Mesh(geo(g), m);
      x.castShadow = true;
      return x;
    };
    // A part whose shape follows a size. It is made again when the size changes.
    const remake = (m: THREE.Mesh, g: THREE.BufferGeometry) => {
      const i = geometries.indexOf(m.geometry);
      if (i >= 0) geometries.splice(i, 1);
      m.geometry.dispose();
      m.geometry = geo(g);
    };

    const root = new THREE.Group();
    const model = new THREE.Group();
    root.add(model);
    scene.add(root);

    const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(120, 120)), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    root.add(floor);

    // Threadless: the steerer clamp is a tube with a bore and a slit at the back. Two bosses cross the slit, each
    // with a bolt. A stem cap with its bolt closes the top.
    const threadless = new THREE.Group();
    model.add(threadless);
    const clamp = mesh(new THREE.BufferGeometry(), skin);
    threadless.add(clamp);
    // The bolts point in turn in opposite directions, so the clamp pulls evenly. A clamp taller than TALL_CLAMP has
    // four bolts, the others two.
    const rearBosses = [0, 1, 2, 3].map((n) => {
      const g = new THREE.Group();
      for (const s of [1, -1]) {
        const h = mesh(bossHalf(BOSS_L / 2 - 0.04).rotateX((s * Math.PI) / 2).translate(0, 0, s * 0.04), skin);
        g.add(h);
      }
      const b = bolt(steel, dark);
      b.rotation.x = n % 2 === 0 ? Math.PI / 2 : -Math.PI / 2;
      b.position.z = n % 2 === 0 ? BOSS_L / 2 : -BOSS_L / 2;
      g.add(b);
      threadless.add(g);
      return g;
    });
    const cap = new THREE.Group();
    const capR = CLAMP_R - 0.03;
    const capPoints = [new THREE.Vector2(0, 0)];
    arc(capPoints, capR - 0.05, 0.05, 0.05, -Math.PI / 2, 0, 4);
    arc(capPoints, capR - 0.24, 0.5, 0.24, 0, Math.PI / 2, 8);
    arc(capPoints, 0.5, 0.48, 0.02, Math.PI / 2, Math.PI, 2);
    capPoints.push(new THREE.Vector2(0.48, 0.29), new THREE.Vector2(0, 0.29));
    cap.add(mesh(new THREE.LatheGeometry(capPoints, 96), skin));
    const capBolt = bolt(steel, dark);
    capBolt.position.y = 0.29;
    capBolt.scale.set(1, 0.5, 1);
    cap.add(capBolt);
    threadless.add(cap);

    // A spacer: a ring with rounded edges, its height from the options. A cap: the same cap as on the stem, with an
    // integrated spacer under it for a spacer cap. These parts are made again when their height changes.
    const spacer = mesh(new THREE.BufferGeometry(), skin);
    model.add(spacer);
    const partCap = new THREE.Group();
    partCap.add(mesh(new THREE.LatheGeometry(capPoints, 96), skin));
    const partCapBolt = bolt(steel, dark);
    partCapBolt.position.y = 0.29;
    partCapBolt.scale.set(1, 0.5, 1);
    partCap.add(partCapBolt);
    const capRing = mesh(new THREE.BufferGeometry(), skin);
    partCap.add(capRing);
    model.add(partCap);
    let madePart = "";

    // Quill: a long round tube with a smooth, rounded top. Near the bottom, a slanted cut and the wedge below it.
    const quill = new THREE.Group();
    model.add(quill);
    const quillHead = mesh(new THREE.LatheGeometry(profile(0, QUILL_R, -0.6, 0, 0.01, 0.16), 96), skin);
    const quillShaft = mesh(new THREE.CylinderGeometry(QUILL_R, QUILL_R, 1, 96, 1, true).translate(0, -0.5, 0), skin);
    // The part above the cut, and the wedge below it. Their own origin is the bottom of the quill.
    const cutPart = mesh(slanted(QUILL_R, 0, CUT_UP + QUILL_R * CUT_TAN + 0.4, "bottom", CUT_UP), skin);
    const wedge = mesh(slanted(QUILL_R, 0, 0, "top", CUT_UP - 0.07), skin);
    quill.add(quillHead, quillShaft, cutPart, wedge);
    // The cut shows as a dark line where the wedge and the quill meet.
    const cutLine = new THREE.Mesh(geo(slanted(QUILL_R - 0.02, 0, 0, "top", CUT_UP - 0.01)), dark);
    quill.add(cutLine);

    // The body: a tapered tube that points along +x from the pivot, and the handlebar clamp at its far end.
    const body = new THREE.Group();
    model.add(body);
    const pipe = mesh(new THREE.CylinderGeometry(BODY_END_R, BODY_R, 1, 96, 1, true).rotateZ(-Math.PI / 2).translate(0.5, 0, 0), skin);
    body.add(pipe);

    // The handlebar clamp. The ring parts are turned around the y axis, then laid on their side so that the axis is
    // z. An angle `a` from the front (+x) in the side view is the angle a + 90° of the lathe.
    const clampRing = new THREE.Group();
    const ringProfile = profile(BAR_R, SPLIT_R, -SPLIT_W / 2, SPLIT_W / 2, 0.14, 0.14, 0.05);
    const lathe = (a: number) => a + Math.PI / 2;
    const face = ringPart(ringProfile, lathe(-SPLIT_A + SPLIT_GAP), lathe(SPLIT_A - SPLIT_GAP), 64).rotateX(Math.PI / 2);
    const back = ringPart(ringProfile, lathe(SPLIT_A + SPLIT_GAP), lathe(2 * Math.PI - SPLIT_A - SPLIT_GAP), 128).rotateX(Math.PI / 2);
    clampRing.add(mesh(face, skin), mesh(back, skin));
    // Four bolts hold the face plate: two bosses at each split, one near each side of the clamp.
    for (const [s, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const a = s * SPLIT_A;
      // The boss is along the tangent of the ring at the split, half on each part, with a gap between the halves.
      const boss = new THREE.Group();
      boss.position.set(Math.cos(a) * (SPLIT_R + 0.04), Math.sin(a) * (SPLIT_R + 0.04), z * (SPLIT_W / 2 - BOSS_R - 0.12));
      boss.rotation.z = a;
      for (const d of [1, -1]) {
        boss.add(mesh(bossHalf(BOSS_L / 2 - 0.04).rotateZ(d === 1 ? 0 : Math.PI).translate(0, d * 0.04, 0), skin));
      }
      // The head of the bolt is on the face part, so that it shows from the front.
      const b = bolt(steel, dark);
      b.rotation.z = s === 1 ? Math.PI : 0;
      b.position.y = s === 1 ? -BOSS_L / 2 : BOSS_L / 2;
      boss.add(b);
      clampRing.add(boss);
    }
    body.add(clampRing);

    // The joints follow the line where the body tube meets the other tube (the steerer clamp or the quill, and the
    // handlebar ring). The line is worked out for each frame from the real sizes, so the joint sits on both tubes.
    // Brazed: a smooth fillet of brass, in its own colour, that sweeps from the body onto the other tube.
    // Welded: a TIG weld, a bead along the line, with rows of overlapping ripples ("stacked dimes").
    // The parts live in the model, not in the body, because the line is worked out in the frame of the model.
    const brazed = new THREE.Group();
    const welded = new THREE.Group();
    model.add(brazed, welded);
    const filletGeo = (): THREE.BufferGeometry => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((JOINT_N + 1) * (JOINT_M + 1) * 3), 3));
      const index: number[] = [];
      for (let i = 0; i < JOINT_N; i++) {
        for (let j = 0; j < JOINT_M; j++) {
          const a = i * (JOINT_M + 1) + j;
          const b = (i + 1) * (JOINT_M + 1) + j;
          index.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
      g.setIndex(index);
      return g;
    };
    const fillets = [filletGeo(), filletGeo()];
    fillets.forEach((g) => {
      const m = mesh(g, braze);
      m.frustumCulled = false;
      brazed.add(m);
    });
    // A weld bead is a tube along the line. It is made again each frame, so the old one is thrown away.
    const beadMeshes = [0, 1].map(() => {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), weld);
      m.castShadow = true;
      m.frustumCulled = false;
      welded.add(m);
      return m;
    });
    const unit = (v: THREE.Vector3) => v.normalize();

    // The state that the picture shows now. The loop moves it toward the target.
    const now = stemOf(params);
    const size = new THREE.Vector2(1, 1);
    // The box that holds the stem, in the frame of the root, for the camera.
    const box = new THREE.Box3();
    let madeH = -1;
    let elevation = ELEVATION;

    function place() {
      const { length: L, rise, quill: qn, welded: w, bodyK: k } = now;
      const q = qn > 0.5;
      const shown = Math.max(L - (SPLIT_R - 0.48), 0.5);
      const cosR = Math.cos(rise);
      const sinR = Math.sin(rise);
      const radiusAt = (s: number) => k * (BODY_R + (BODY_END_R - BODY_R) * Math.min(Math.max(s / shown, 0), 1));
      const steererR = q ? QUILL_R : CLAMP_R;
      // The distance along the body to the point where the body surface at the angle `f` meets the steerer or the quill.
      const backS = (f: number) => {
        let s = 2;
        for (let it = 0; it < 4; it++) {
          const r = radiusAt(s);
          s = (r * Math.cos(f) * sinR + Math.sqrt(Math.max(steererR ** 2 - (r * Math.sin(f)) ** 2, 0))) / cosR;
        }
        return s;
      };
      // The body joins the steerer as high as it can: the joint and its fillet stay under the stem cap (or under the
      // rounded top of the quill) for every angle. The height of the joint line above the pivot changes with the
      // angle, so it is worked out first. A clamp that is too short for the angle has the joint in its middle.
      let jointTop = -Infinity;
      let jointLow = Infinity;
      for (let i = 0; i < 48; i++) {
        const f = (i / 48) * Math.PI * 2;
        const s = backS(f);
        const y = s * sinR + radiusAt(s) * Math.cos(f) * cosR;
        jointTop = Math.max(jointTop, y);
        jointLow = Math.min(jointLow, y);
      }
      // The joint takes JOINT_MARGIN above and below the line where the tubes meet, as the order rule allows for.
      const spread = JOINT_MARGIN_MM / 10 - 0.06;
      // A steerer clamp that is too short for the body at this angle cannot be made. The model then shows the
      // shortest clamp that holds the body, so the body never sticks out of the clamp.
      const H = q ? now.height : Math.max(now.height, jointTop - jointLow + 2 * (spread + 0.06));
      const yTop = H / 2;
      const quillLen = H + QUILL_EXTRA;
      const bodyR = BODY_R * k;

      // The parts whose shape follows the height.
      if (Math.abs(H - madeH) > 1e-4) {
        madeH = H;
        // The slit is at the back (the lathe angle 270°).
        remake(clamp, ringPart(profile(BORE_R, CLAMP_R, -H / 2, H / 2, 0.12, 0.12), 1.5 * Math.PI + 0.012, 3.5 * Math.PI - 0.012, 128));
      }
      threadless.visible = !q;
      const by = Math.min(Math.max(H / 2 - 0.75, 0.55), H / 2 - BOSS_R);
      const bolts = H < 2.4 ? 1 : H > TALL_CLAMP ? 4 : 2;
      rearBosses.forEach((g, i) => {
        g.position.set(-(CLAMP_R + 0.04), bolts === 1 ? 0 : by - (2 * by * i) / (bolts - 1), 0);
        g.visible = i < bolts;
      });
      cap.position.y = yTop;

      quill.visible = q;
      const bottom = yTop - quillLen;
      quillHead.position.y = yTop;
      const shaftTop = yTop - 0.6;
      const shaftBottom = bottom + CUT_UP + QUILL_R * CUT_TAN + 0.4;
      quillShaft.position.y = shaftTop;
      quillShaft.scale.y = Math.max(shaftTop - shaftBottom, 0.01);
      cutPart.position.y = wedge.position.y = cutLine.position.y = bottom;

      const roof = (q ? yTop - 0.16 : yTop) - spread - 0.06;
      const floorY = (q ? bottom : -H / 2) + spread + 0.06;
      const pivotY = roof - jointTop >= floorY - jointLow ? roof - jointTop : (roof + floorY) / 2 - (jointTop + jointLow) / 2;
      body.position.set(0, pivotY, 0);
      body.rotation.z = rise;
      pipe.scale.set(shown, k, k);
      clampRing.position.x = L;
      // The line where the body meets the steerer or the quill, and the line where it meets the ring. For each angle
      // `f` around the body, the point on the body surface that is on the other tube is worked out, and then the
      // point on the body (`a`) and the point on the other tube (`b`) where the fillet leaves them.
      const axis = new THREE.Vector3(cosR, sinR, 0);
      const side = new THREE.Vector3(-sinR, cosR, 0);
      const pivot = new THREE.Vector3(0, pivotY, 0);
      const surface = (s: number, f: number, out: THREE.Vector3) =>
        out.copy(pivot).addScaledVector(axis, s).addScaledVector(side, radiusAt(s) * Math.cos(f)).add(new THREE.Vector3(0, 0, radiusAt(s) * Math.sin(f)));
      const ringC = pivot.clone().addScaledVector(axis, L);
      const reach = Math.min(0.5, Math.max(0.2, (L - 1.62 - 1.9) / 2.2));
      const topLimit = (q ? yTop - 0.16 : yTop) - 0.02;
      const botLimit = (q ? bottom : -H / 2) + 0.02;
      const joints = [0, 1].map((which) => {
        const qs: THREE.Vector3[] = [];
        const as: THREE.Vector3[] = [];
        const bs: THREE.Vector3[] = [];
        for (let i = 0; i <= JOINT_N; i++) {
          const f = (i / JOINT_N) * Math.PI * 2;
          let s = which === 0 ? backS(f) : L - 2;
          if (which === 1) for (let it = 0; it < 4; it++) s = L - Math.sqrt(Math.max(SPLIT_R ** 2 - (radiusAt(s) * Math.cos(f)) ** 2, 0));
          const Q = surface(s, f, new THREE.Vector3());
          const A = surface(which === 0 ? s + reach : s - reach, f, new THREE.Vector3());
          const nb = unit(new THREE.Vector3().addScaledVector(side, Math.cos(f)).add(new THREE.Vector3(0, 0, Math.sin(f))));
          const ns = which === 0 ? unit(new THREE.Vector3(Q.x, 0, Q.z)) : unit(new THREE.Vector3(Q.x - ringC.x, Q.y - ringC.y, 0));
          // Away from the body, over the surface of the other tube.
          const e = unit(nb.clone().addScaledVector(ns, -nb.dot(ns)));
          const B = Q.clone().addScaledVector(e, spread);
          if (which === 0) {
            const h = Math.hypot(B.x, B.z) || 1;
            B.set((B.x * steererR) / h, Math.min(Math.max(B.y, botLimit), topLimit), (B.z * steererR) / h);
          } else {
            const h = Math.hypot(B.x - ringC.x, B.y - ringC.y) || 1;
            B.set(ringC.x + ((B.x - ringC.x) * SPLIT_R) / h, ringC.y + ((B.y - ringC.y) * SPLIT_R) / h, Math.min(Math.max(B.z, -SPLIT_W / 2 + 0.05), SPLIT_W / 2 - 0.05));
          }
          // A little outside both surfaces, so the fillet does not flicker where it touches them.
          A.addScaledVector(nb, 0.015);
          B.addScaledVector(ns, 0.015);
          qs.push(Q);
          as.push(A);
          bs.push(B);
        }
        return { qs, as, bs };
      });
      const brazedNow = w < 0.5;
      brazed.visible = brazedNow;
      welded.visible = !brazedNow;
      if (brazedNow) {
        joints.forEach((jt, n) => {
          const pos = fillets[n].getAttribute("position") as THREE.BufferAttribute;
          for (let i = 0; i <= JOINT_N; i++) {
            for (let j = 0; j <= JOINT_M; j++) {
              const t = j / JOINT_M;
              // A bend from the body, through the corner, to the other tube: it fills the corner in a smooth curve.
              const u = 1 - t;
              pos.setXYZ(
                i * (JOINT_M + 1) + j,
                u * u * jt.as[i].x + 2 * u * t * jt.qs[i].x + t * t * jt.bs[i].x,
                u * u * jt.as[i].y + 2 * u * t * jt.qs[i].y + t * t * jt.bs[i].y,
                u * u * jt.as[i].z + 2 * u * t * jt.qs[i].z + t * t * jt.bs[i].z,
              );
            }
          }
          pos.needsUpdate = true;
          fillets[n].computeVertexNormals();
          fillets[n].computeBoundingBox();
        });
      } else {
        joints.forEach((jt, n) => {
          beadMeshes[n].geometry.dispose();
          beadMeshes[n].geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(jt.qs.slice(0, JOINT_N), true), 240, 0.13, 12, true);
        });
      }

      skin.color.copy(now.color);
      skin.roughness = now.roughness;
      skin.metalness = now.metalness;
      skin.bumpScale = now.brushed * 0.5;
      // The weld is the metal of the stem, a little darker and warmer from the heat, and less shiny.
      weld.color.copy(now.color).lerp(HEAT, 0.28);
      weld.metalness = 1;
      weld.roughness = Math.min(now.roughness + 0.2, 0.8);
      braze.roughness = Math.min(0.2 + now.roughness * 0.3, 0.45);

      // The part that shows. The stem parts are hidden for a spacer or a cap.
      const isStem = now.part === "stems";
      threadless.visible = threadless.visible && isStem;
      quill.visible = quill.visible && isStem;
      body.visible = isStem;
      brazed.visible = brazed.visible && isStem;
      welded.visible = welded.visible && isStem;
      spacer.visible = now.part === "spacers";
      partCap.visible = now.part === "caps";
      capRing.visible = now.capType === "Spacer cap";
      const ph = now.partHeight;
      const key = `${now.part}|${now.spacerSize}|${ph.toFixed(4)}`;
      if (!isStem && key !== madePart) {
        madePart = key;
        const round = Math.min(0.06, ph / 4);
        if (now.part === "spacers") {
          const sz = SPACER[now.spacerSize] ?? SPACER['1 1/8"'];
          remake(spacer, new THREE.LatheGeometry(profile(sz.bore, sz.outer, 0, ph, round, round, Math.min(0.03, ph / 5)), 128));
        } else {
          remake(capRing, new THREE.LatheGeometry(profile(BORE_R, CAP_RING_R, -ph, 0.02, round, 0.01, Math.min(0.03, ph / 5)), 128));
        }
      }
      elevation = isStem ? ELEVATION : PART_ELEVATION;

      // Centre the part on the root, with the floor under it.
      model.position.set(0, 0, 0);
      model.updateMatrixWorld(true);
      box.makeEmpty();
      const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
      model.traverseVisible((o) => {
        if (!(o instanceof THREE.Mesh) || o.parent === null) return;
        const g = o.geometry as THREE.BufferGeometry;
        if (!g.getAttribute("position")) return;
        if (!g.boundingBox) g.computeBoundingBox();
        const b = g.boundingBox!.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        box.union(b);
      });
      const c = box.getCenter(new THREE.Vector3());
      model.position.set(-c.x, -c.y, -c.z);
      box.translate(new THREE.Vector3(-c.x, -c.y, -c.z));
      floor.position.y = box.min.y;
    }

    function frame(k: number) {
      const t = target.current;
      let moving = false;
      // The part and its type change at once. The sizes slide.
      if (now.part !== t.part || now.spacerSize !== t.spacerSize || now.capType !== t.capType) {
        now.part = t.part;
        now.spacerSize = t.spacerSize;
        now.capType = t.capType;
        moving = true;
      }
      const ease = (key: Exclude<keyof Stem, "color" | "part" | "spacerSize" | "capType">) => {
        const d = t[key] - now[key];
        if (Math.abs(d) < 0.0005) now[key] = t[key];
        else {
          now[key] += d * k;
          moving = true;
        }
      };
      (["length", "height", "rise", "roughness", "metalness", "brushed", "quill", "welded", "bodyK", "partHeight"] as const).forEach(ease);
      if (Math.abs(t.color.r - now.color.r) + Math.abs(t.color.g - now.color.g) + Math.abs(t.color.b - now.color.b) > 0.002) {
        now.color.lerp(t.color, k);
        moving = true;
      } else now.color.copy(t.color);
      if (moving || madeH < 0) place();
      return moving;
    }

    // The camera distance that keeps the stem inside the picture for every view that a drag can give. The corners of
    // the box are turned to 12 views and projected. The stem then has the same size while the visitor drags it.
    const corners = Array.from({ length: 8 }, () => new THREE.Vector3());
    function fit() {
      const tanY = Math.tan((camera.fov * Math.PI) / 360);
      const tanX = tanY * camera.aspect;
      const dir = new THREE.Vector3(0, Math.sin(elevation), Math.cos(elevation));
      // Start far away, then move in so that the widest view fills 84% of the picture.
      let d = 400;
      for (let pass = 0; pass < 3; pass++) {
        camera.position.copy(dir).multiplyScalar(d);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        let m = 0;
        for (let v = 0; v < 12; v++) {
          const yaw = (v / 12) * Math.PI * 2;
          const rot = new THREE.Matrix4().makeRotationY(yaw);
          let i = 0;
          for (const x of [box.min.x, box.max.x])
            for (const y of [box.min.y, box.max.y])
              for (const z of [box.min.z, box.max.z]) corners[i++].set(x, y, z).applyMatrix4(rot);
          for (const p of corners) {
            const e = p.clone().applyMatrix4(camera.matrixWorldInverse);
            const depth = -e.z;
            m = Math.max(m, Math.abs(e.x) / (depth * tanX), Math.abs(e.y) / (depth * tanY));
          }
        }
        d *= m / 0.84;
      }
      camera.position.copy(dir).multiplyScalar(d);
      camera.lookAt(0, 0, 0);
    }

    function resize() {
      const w = el!.clientWidth || 1;
      const h = el!.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      size.set(w, h);
      view.current.dirty = true;
    }
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    let raf = 0;
    let last = performance.now();
    function loop(time: number) {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((time - last) / 1000, 0.1);
      last = time;
      const v = view.current;
      const reduced = stillRef.current;
      // A change goes at once for a visitor who wants less motion, and slides for the others.
      const moving = frame(reduced ? 1 : 1 - Math.exp(-dt * 9));
      // The picture is still unless an option changes, the visitor drags, or the box changes size.
      if (!moving && !v.dirty) return;
      v.dirty = false;
      root.rotation.y = v.yaw;
      fit();
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(loop);

    const lost = (e: Event) => e.preventDefault();
    el.addEventListener("webglcontextlost", lost);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      el.removeEventListener("webglcontextlost", lost);
      geometries.forEach((g) => g.dispose());
      beadMeshes.forEach((m) => m.geometry.dispose());
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      [skin, steel, dark, floorMat, braze, weld].forEach((m) => m.dispose());
      brush.dispose();
      ripple.dispose();
      envMap.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
    // The loop reads the newest values from the refs, so it must start only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A drag turns the stem about the vertical axis. The page still scrolls up and down (touch-action: pan-y).
  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    view.current.drag = true;
    view.current.x = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const v = view.current;
    if (!v.drag) return;
    v.yaw += (e.clientX - v.x) * 0.009;
    v.x = e.clientX;
    v.dirty = true;
  };
  const onUp = () => {
    view.current.drag = false;
  };

  return (
    <canvas
      ref={canvas}
      className={styles.canvas}
      role="img"
      aria-label={label}
      data-part={params.part}
      data-part-height={params.partHeightMm}
      data-spacer-size={params.spacerSize}
      data-cap-type={params.capType}
      data-type={params.type}
      data-length={params.lengthMm}
      data-height={params.heightMm}
      data-angle={params.riseDeg}
      data-material={params.material}
      data-finish={params.finish}
      data-bond={params.bond}
      data-bolts={params.type === "Threadless" ? (params.heightMm < 24 ? 1 : params.heightMm > TALL_CLAMP * 10 ? 4 : 2) : 0}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    />
  );
}
