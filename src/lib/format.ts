// All money math lives in Postgres — these helpers only format for display.

const egpFormatter = new Intl.NumberFormat('ar-EG', {
  style: 'currency',
  currency: 'EGP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' })

const monthFormatter = new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' })

const timeFormatter = new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' })

const compactFormatter = new Intl.NumberFormat('ar-EG', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const dayMonthFormatter = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' })

export function formatEGP(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0)
  return egpFormatter.format(Number.isFinite(n) ? n : 0)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return dateFormatter.format(typeof value === 'string' ? new Date(value) : value)
}

export function formatMonth(value: string | Date): string {
  return monthFormatter.format(typeof value === 'string' ? new Date(value) : value)
}

export function formatTime(value: string | Date): string {
  return timeFormatter.format(typeof value === 'string' ? new Date(value) : value)
}

export function formatCompactNumber(value: number): string {
  return compactFormatter.format(value)
}

export function formatDayMonth(value: string | Date): string {
  return dayMonthFormatter.format(typeof value === 'string' ? new Date(value) : value)
}

/**
 * جمع مبالغ محسوبة مسبقًا في قاعدة البيانات، للعرض فقط.
 * Sums money values that Postgres already computed, for display only. Values are
 * numeric(12,2) server-side, so rounding back to 2dp removes the float artefacts
 * that plain addition would surface (0.1 + 0.2). This never decides state — the
 * authoritative balances always come from the database.
 */
export function sumMoney(values: Array<number | null | undefined>): number {
  const total = values.reduce<number>((acc, v) => acc + (typeof v === 'number' ? v : 0), 0)
  return Math.round(total * 100) / 100
}

/** yyyy-mm-dd for <input type="date"> defaults, in local time. */
export function todayISO(): string {
  const d = new Date()
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
