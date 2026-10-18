// Format an amount in pounds, without the pence when there are none.
export function gbp(n: number): string {
  return `£${n.toFixed(2).replace(/\.00$/, "")}`;
}
