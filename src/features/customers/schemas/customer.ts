import { z } from 'zod'

const egyptianPhone = z.string().regex(/^01[0-9]{9}$/, 'رقم الهاتف بصيغة 01xxxxxxxxx')

// بيانات الشخص فقط — كل المبالغ انتقلت إلى العقد، لأن العميل الواحد قد يملك
// أكثر من عقد في وقت واحد.
// Identity only. Every amount moved to the contract, because one customer can
// hold several concurrent installment plans.
export const customerSchema = z.object({
  full_name: z.string().min(1, 'الاسم الكامل مطلوب'),
  known_as: z.string().min(1, 'الشهرة مطلوبة'),
  phone: egyptianPhone,
  alt_phone: egyptianPhone.or(z.literal('')),
  national_id: z.string().regex(/^[0-9]{14}$/, 'الرقم القومي 14 رقمًا'),
  address: z.string().min(1, 'العنوان مطلوب'),
  guarantor_name: z.string(),
  guarantor_relation: z.string(),
  guarantor_phone: egyptianPhone.or(z.literal('')),
  guarantor_address: z.string(),
  legal_status: z.enum(['clean', 'in_litigation'], { message: 'حدد الحالة القانونية' }),
})

export type CustomerInput = z.infer<typeof customerSchema>

export const customerFilterDefaults = {
  search: '',
  category: 'all',
  legalStatus: 'all',
  archived: false,
} as const

export interface CustomerFilters {
  search: string
  /** يُطبَّق على عقود العميل، لا على العميل نفسه · applied to the customer's contracts */
  category: 'all' | 'household' | 'appliances' | 'furniture'
  legalStatus: 'all' | 'clean' | 'in_litigation'
  archived: boolean
}
