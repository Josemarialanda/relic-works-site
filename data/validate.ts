// Checks for the JSON data files. A wrong value stops the build (and the page) with a message that names the
// file and the field, for example: data/products.json: products[2].price: must be a number above 0.
// The same checks run in the browser, but the build fails first, so a visitor never sees the error.

export function fail(file: string, where: string, problem: string): never {
  throw new Error(`data/${file}: ${where}: ${problem}`);
}

export function object(v: unknown, file: string, where: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) fail(file, where, "must be an object");
  return v as Record<string, unknown>;
}

export function array(v: unknown, file: string, where: string): unknown[] {
  if (!Array.isArray(v)) fail(file, where, "must be a list");
  return v;
}

export function string(v: unknown, file: string, where: string): string {
  if (typeof v !== "string" || v.trim() === "") fail(file, where, "must be text that is not empty");
  return v;
}

// A price or an amount in pounds: a number of 0 or more (or above 0), with at most 2 decimal places.
export function money(v: unknown, file: string, where: string, { min = 0, above = false } = {}): number {
  if (typeof v !== "number" || !Number.isFinite(v) || (above ? v <= min : v < min)) {
    fail(file, where, `must be a number ${above ? "above" : "of"} ${min}`);
  }
  if (Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) fail(file, where, "must have at most 2 decimal places");
  return v;
}

export function number(v: unknown, file: string, where: string, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) fail(file, where, `must be a number from ${min} to ${max}`);
  return v;
}

// A list of different texts. It needs at least one.
export function strings(v: unknown, file: string, where: string): string[] {
  const list = array(v, file, where).map((x, i) => string(x, file, `${where}[${i}]`));
  if (list.length === 0) fail(file, where, "must have at least one item");
  const repeated = list.find((x, i) => list.indexOf(x) !== i);
  if (repeated !== undefined) fail(file, where, `has "${repeated}" more than once`);
  return list;
}

export function oneOf(v: unknown, allowed: readonly string[], file: string, where: string): string {
  const s = string(v, file, where);
  if (!allowed.includes(s)) fail(file, where, `"${s}" is not one of: ${allowed.join(", ")}`);
  return s;
}

// A range: [lowest, highest].
export function range(v: unknown, file: string, where: string): [number, number] {
  const r = array(v, file, where);
  if (r.length !== 2 || typeof r[0] !== "number" || typeof r[1] !== "number" || r[0] >= r[1]) {
    fail(file, where, "must be two numbers, the lowest first, for example [40, 150]");
  }
  return [r[0], r[1]];
}

// The key of a record must be in the list, and each list item must have a key (so a price is never missing).
export function numbersFor(v: unknown, keys: readonly string[], file: string, where: string, min: number, above = false): Record<string, number> {
  const o = object(v, file, where);
  const out: Record<string, number> = {};
  for (const key of Object.keys(o)) if (!keys.includes(key)) fail(file, `${where}.${key}`, `"${key}" is not in the list that this refers to`);
  for (const key of keys) {
    const n = o[key];
    if (typeof n !== "number" || !Number.isFinite(n) || (above ? n <= min : n < min)) fail(file, `${where}.${key}`, `must be a number ${above ? "above" : "of"} ${min}`);
    out[key] = n;
  }
  return out;
}
