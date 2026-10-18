// The delivery zones. Edit data/shipping.json. The bag, the support page and the checkout server all read
// these, so a price changes in one place. The rates and the country lists are business choices: check them
// before launch. See data/README.md.

import raw from "./shipping.json";
import { array, fail, money, object, string } from "./validate";

export type ZoneId = string;

export type Zone = {
  id: ZoneId;
  label: string;
  // The delivery price in pounds.
  price: number;
  // Delivery is free from this subtotal (in pounds). Not every zone has it.
  freeFrom?: number;
  note: string;
  // The countries that the customer can pick at the payment page (ISO 3166-1 alpha-2).
  countries: string[];
};

const FILE = "shipping.json";

export function parseZones(data: unknown): Zone[] {
  const zones = array(object(data, FILE, "the file").zones, FILE, "zones").map((item, i): Zone => {
    const where = `zones[${i}]`;
    const z = object(item, FILE, where);
    const id = string(z.id, FILE, `${where}.id`);
    if (!/^[a-z][a-z0-9-]*$/.test(id)) fail(FILE, `${where}.id`, "must be lower-case letters, digits and hyphens, for example uk");
    const countries = array(z.countries, FILE, `${where}.countries`).map((c, j) => {
      const code = string(c, FILE, `${where}.countries[${j}]`);
      if (!/^[A-Z]{2}$/.test(code)) fail(FILE, `${where}.countries[${j}]`, `"${code}" must be a two-letter country code in capitals, for example GB`);
      return code;
    });
    if (countries.length === 0) fail(FILE, `${where}.countries`, "must have at least one country");
    return {
      id,
      label: string(z.label, FILE, `${where}.label`),
      price: money(z.price, FILE, `${where}.price`),
      ...(z.freeFrom !== undefined && { freeFrom: money(z.freeFrom, FILE, `${where}.freeFrom`, { above: true }) }),
      note: string(z.note, FILE, `${where}.note`),
      countries,
    };
  });
  if (zones.length === 0) fail(FILE, "zones", "must have at least one zone");

  const seen = new Map<string, string>();
  zones.forEach((z, i) => {
    if (zones.findIndex((q) => q.id === z.id) !== i) fail(FILE, `zones[${i}].id`, `"${z.id}" is used by more than one zone`);
    for (const c of z.countries) {
      if (seen.has(c)) fail(FILE, `zones[${i}].countries`, `${c} is in the zone "${seen.get(c)}" and in the zone "${z.id}"`);
      seen.set(c, z.id);
    }
  });
  return zones;
}

export const ZONES: Zone[] = parseZones(raw);
