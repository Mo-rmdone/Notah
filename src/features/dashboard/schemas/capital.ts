import { z } from 'zod'

export const capitalEntrySchema = z.object({
  amount: z
    .string()
    .min(1, 'المبلغ مطلوب')
    .regex(/^\d{1,10}(\.\d{1,2})?$/, 'مبلغ غير صحيح')
    .refine((v) => Number(v) > 0, 'المبلغ يجب أن يكون أكبر من صفر'),
  entry_type: z.enum(['deposit', 'withdrawal'], { message: 'حدد نوع الحركة' }),
  entry_date: z.string().min(1, 'التاريخ مطلوب'),
  note: z.string(),
})

export type CapitalEntryInput = z.infer<typeof capitalEntrySchema>
