import { z } from 'zod'

// Money fields stay strings end-to-end in the form; they are converted once,
// at the API boundary, and all arithmetic happens in Postgres.
const money = z
  .string()
  .min(1, 'المبلغ مطلوب')
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'مبلغ غير صحيح')

const egyptianPhone = z.string().regex(/^01[0-9]{9}$/, 'رقم الهاتف بصيغة 01xxxxxxxxx')

export const customerSchema = z
  .object({
    full_name: z.string().min(1, 'الاسم الكامل مطلوب'),
    known_as: z.string().min(1, 'الشهرة مطلوبة'),
    phone: egyptianPhone,
    alt_phone: egyptianPhone.or(z.literal('')),
    national_id: z.string().regex(/^[0-9]{14}$/, 'الرقم القومي 14 رقمًا'),
    address: z.string().min(1, 'العنوان مطلوب'),
    category: z.enum(['household', 'appliances', 'furniture'], {
      message: 'اختر نوع البضاعة',
    }),
    total_amount: money.refine((v) => Number(v) > 0, 'الإجمالي يجب أن يكون أكبر من صفر'),
    down_payment: money,
    monthly_installment: money.refine((v) => Number(v) > 0, 'القسط يجب أن يكون أكبر من صفر'),
    guarantor_name: z.string(),
    guarantor_relation: z.string(),
    guarantor_phone: egyptianPhone.or(z.literal('')),
    guarantor_address: z.string(),
    trust_receipt: z.enum(['yes', 'no'], { message: 'حدد وصل الأمانة' }),
    legal_status: z.enum(['clean', 'in_litigation'], { message: 'حدد الحالة القانونية' }),
  })
  .superRefine((values, ctx) => {
    if (Number(values.down_payment) > Number(values.total_amount)) {
      ctx.addIssue({
        code: 'custom',
        path: ['down_payment'],
        message: 'المقدم لا يمكن أن يتجاوز الإجمالي',
      })
    }
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
  category: 'all' | 'household' | 'appliances' | 'furniture'
  legalStatus: 'all' | 'clean' | 'in_litigation'
  archived: boolean
}
