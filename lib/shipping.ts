import { ZONES, type Zone } from "../data/shipping";

export function zoneById(id: unknown): Zone | undefined {
  return ZONES.find((z) => z.id === id);
}

// The delivery price for a subtotal in pounds. An empty bag has no delivery price.
export function shippingCost(zone: Zone, subtotal: number): number {
  if (subtotal === 0) return 0;
  return zone.freeFrom !== undefined && subtotal >= zone.freeFrom ? 0 : zone.price;
}
