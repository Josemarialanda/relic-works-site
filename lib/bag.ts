import { useSyncExternalStore } from "react";

export type BagItem = {
  key: string;
  type: string;
  name: string;
  spec: string;
  price: number;
  qty: number;
  image: string | null;
  bespoke?: boolean;
};

const STORAGE_KEY = "relic-bag";
const CHANGE_EVENT = "relicbag";

// Demo contents for a first visit, as in the design.
const SEED: BagItem[] = [
  { key: "Relic Brazed Stem|Steel · Painted", type: "Stems", name: "Relic Brazed Stem", spec: "Steel · Painted", price: 185, qty: 1, image: null },
  { key: "Bespoke Stem|demo", type: "Bespoke stem", name: "Bespoke Stem", spec: "Titanium · Polished · 40 mm height · 100 mm · ±17°", price: 290, qty: 1, image: null, bespoke: true },
  { key: "Hammered Ti Cap|Titanium · Raw", type: "Stem caps", name: "Hammered Ti Cap", spec: "Titanium · Raw", price: 38, qty: 2, image: null },
];

const EMPTY: BagItem[] = [];

function isBagItem(v: unknown): v is BagItem {
  if (typeof v !== "object" || v === null) return false;
  const i = v as Record<string, unknown>;
  return (
    typeof i.key === "string" &&
    typeof i.name === "string" &&
    typeof i.type === "string" &&
    typeof i.spec === "string" &&
    typeof i.price === "number" &&
    Number.isInteger(i.qty) &&
    (i.qty as number) > 0
  );
}

// useSyncExternalStore needs a stable snapshot, so parse only when the raw value changes.
let cachedRaw: string | null | undefined;
let cachedItems: BagItem[] = EMPTY;

function read(): BagItem[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  if (raw === null) {
    cachedItems = SEED;
  } else {
    try {
      const parsed: unknown = JSON.parse(raw);
      cachedItems = Array.isArray(parsed) ? parsed.filter(isBagItem) : EMPTY;
    } catch {
      cachedItems = EMPTY;
    }
  }
  return cachedItems;
}

export function setBag(items: BagItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Could not save the bag", err);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addToBag(item: Omit<BagItem, "qty">): void {
  const items = read();
  const existing = items.find((i) => i.key === item.key);
  setBag(
    existing
      ? items.map((i) => (i.key === item.key ? { ...i, qty: i.qty + 1 } : i))
      : [...items, { ...item, qty: 1 }],
  );
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useBag(): BagItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function bagCount(items: BagItem[]): number {
  return items.reduce((a, i) => a + i.qty, 0);
}

export function gbp(n: number): string {
  return `£${n.toFixed(2).replace(/\.00$/, "")}`;
}
