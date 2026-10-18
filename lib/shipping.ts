// Delivery zones. The bag, the support page and the checkout server all read these, so a price
// changes in one place. The rates and the country lists are business choices: check them before launch.

export type ZoneId = "uk" | "europe" | "world";

export type Zone = {
  id: ZoneId;
  label: string;
  // The delivery price in pounds.
  price: number;
  // Delivery is free from this subtotal. Only the UK has it.
  freeFrom?: number;
  note: string;
  // The countries that the customer can pick at the payment page (ISO 3166-1 alpha-2).
  countries: string[];
};

export const ZONES: Zone[] = [
  { id: "uk", label: "United Kingdom", price: 6, freeFrom: 100, note: "Free over £100. 1–2 working days.", countries: ["GB"] },
  {
    id: "europe",
    label: "Europe",
    price: 15,
    note: "3–6 working days. Duties prepaid.",
    countries: [
      "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO",
      "SK", "SI", "ES", "SE", "CH", "NO", "IS", "LI",
    ],
  },
  {
    id: "world",
    label: "Rest of world",
    price: 25,
    note: "5–10 working days. Duties paid on delivery.",
    countries: ["US", "CA", "AU", "NZ", "JP", "SG", "HK", "KR", "AE", "IL", "ZA", "MX", "BR", "TR", "TW", "TH", "MY"],
  },
];

export function zoneById(id: unknown): Zone | undefined {
  return ZONES.find((z) => z.id === id);
}

// The delivery price for a subtotal in pounds. An empty bag has no delivery price.
export function shippingCost(zone: Zone, subtotal: number): number {
  if (subtotal === 0) return 0;
  return zone.freeFrom !== undefined && subtotal >= zone.freeFrom ? 0 : zone.price;
}
