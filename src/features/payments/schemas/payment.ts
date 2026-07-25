import { z } from 'zod'

// Amount stays a string in the form; converted once at the API boundary.
export function createPaymentSchema(remaining: number) {
  return z.object({
    amount: z
      .string()
      .min(1, 'المبلغ مطلوب')
      .regex(/^\d{1,10}(\.\d{1,2})?$/, 'مبلغ غير صحيح')
      .refine((v) => Number(v) > 0, 'المبلغ يجب أن يكون أكبر من صفر')
      .refine((v) => Number(v) <= remaining, 'الدفعة أكبر من المبلغ المتبقي'),
    payment_date: z.string().min(1, 'التاريخ مطلوب'),
    note: z.string(),
  })
}

export type PaymentInput = z.infer<ReturnType<typeof createPaymentSchema>>
