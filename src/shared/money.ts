/**
 * Rounds to 2 decimals compensating float imprecision (e.g. 2.675 * 100 === 267.49999999999997
 * in plain JS). Adding Number.EPSILON before multiplying nudges these boundary cases across the
 * rounding threshold without affecting values that were already precise.
 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
