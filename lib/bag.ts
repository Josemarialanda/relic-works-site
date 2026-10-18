import { useSyncExternalStore } from "react";
import { PART_NAME } from "../data/bespoke";
import { bespokePrice, bespokeSpec, parseBespoke, type BespokeConfig } from "./bespoke";
import { MAX_QTY, productByName } from "./catalog";
export { gbp } from "./money";

export type BagItem = {
  key: string;
  type: string;
  name: string;
  spec: string;
  price: number;
  qty: number;
  image: string | null;
  // The options of a bespoke part. The checkout server prices them again from these options.
  bespoke?: BespokeConfig;
};

const STORAGE_KEY = "relic-bag";
const CHANGE_EVENT = "relicbag";

// The bag item of a bespoke part. The price is for display: the server prices it again.
export function bespokeBagItem(config: BespokeConfig): Omit<BagItem, "qty"> {
  const spec = bespokeSpec(config);
  return {
    key: `Bespoke ${config.part}|${spec}`,
    type: `Bespoke ${PART_NAME[config.part].toLowerCase()}`,
    name: `Bespoke ${PART_NAME[config.part]}`,
    spec,
    price: bespokePrice(config),
    image: `/images/bespoke/${config.part}.jpg`,
    bespoke: config,
  };
}

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
    (i.qty as number) > 0 &&
    // A bag saved earlier can hold a product that the shop no longer sells, or a bespoke part in an
    // old format.
    (i.bespoke !== undefined ? parseBespoke(i.bespoke) !== null : productByName(i.name as string) !== undefined)
  );
}

// The price and quantity that the shop uses now. A saved bag can hold an old price.
function current(item: BagItem): BagItem {
  const bespoke = item.bespoke && parseBespoke(item.bespoke);
  const price = bespoke ? bespokePrice(bespoke) : productByName(item.name)!.price;
  return { ...item, price, qty: Math.min(item.qty, MAX_QTY), ...(bespoke ? { bespoke } : {}) };
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
    cachedItems = EMPTY;
  } else {
    try {
      const parsed: unknown = JSON.parse(raw);
      cachedItems = Array.isArray(parsed) ? parsed.filter(isBagItem).map(current) : EMPTY;
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
