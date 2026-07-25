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

export const categoryOptions = (
  Object.entries(categoryLabels) as Array<[Enums<'product_category'>, string]>
).map(([value, label]) => ({ value, label }))
