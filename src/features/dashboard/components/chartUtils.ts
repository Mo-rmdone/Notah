/** Recharts payload values are `number | string | (number|string)[]`; charts here are always single numbers. */
export function toNumber(value: unknown): number {
  const n = Array.isArray(value) ? Number(value[0]) : Number(value)
  return Number.isFinite(n) ? n : 0
}
