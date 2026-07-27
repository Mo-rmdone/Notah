import type { Enums } from '@/types/database.types'

export const categoryLabels: Record<Enums<'product_category'>, string> = {
  household: 'أدوات منزلية',
  appliances: 'أجهزة كهربائية',
  furniture: 'موبيليا',
}

export const legalStatusLabels: Record<Enums<'legal_status'>, string> = {
  clean: 'سليم',
  in_litigation: 'يتم التقاضي',
}

export const capitalEntryLabels: Record<Enums<'capital_entry_type'>, string> = {
  deposit: 'إيداع',
  withdrawal: 'سحب',
}

/** نافذة السداد الشهرية — اليوم الذي يُعتبر القسط بعده متأخرًا. */
export const paymentWindowLabels: Record<Enums<'payment_window'>, string> = {
  early: 'من ١ إلى ١٠',
  mid: 'من ١١ إلى ٢٠',
  late: 'من ٢١ إلى آخر الشهر',
}

export const paymentWindowOptions = (
  Object.entries(paymentWindowLabels) as Array<[Enums<'payment_window'>, string]>
).map(([value, label]) => ({ value, label }))

export const categoryOptions = (
  Object.entries(categoryLabels) as Array<[Enums<'product_category'>, string]>
).map(([value, label]) => ({ value, label }))
