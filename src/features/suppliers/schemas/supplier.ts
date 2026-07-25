import { z } from 'zod'

const money = z
  .string()
  .min(1, 'المبلغ مطلوب')
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'مبلغ غير صحيح')

// التجار قد يكون لديهم أرقام أرضية، لذا التحقق أوسع من أرقام المحمول
const phone = z
  .string()
  .regex(/^0[0-9]{8,10}$/, 'رقم هاتف غير صحيح')
  .or(z.literal(''))

export const supplierSchema = z.object({
  name: z.string().min(1, 'اسم التاجر مطلوب'),
  trade_type: z.enum(['household', 'appliances', 'furniture'], { message: 'اختر نوع التجارة' }),
  phone_1: phone,
  phone_2: phone,
  total_owed: money,
  monthly_payment: money,
})

export type SupplierInput = z.infer<typeof supplierSchema>

export function createSupplierPaymentSchema(remaining: number) {
  return z.object({
    amount: money
      .refine((v) => Number(v) > 0, 'المبلغ يجب أن يكون أكبر من صفر')
      .refine((v) => Number(v) <= remaining, 'الدفعة أكبر من المبلغ المتبقي'),
    payment_date: z.string().min(1, 'التاريخ مطلوب'),
    note: z.string(),
  })
}

export type SupplierPaymentInput = z.infer<ReturnType<typeof createSupplierPaymentSchema>>

export const invoiceSchema = z.object({
  invoice_number: z.string().min(1, 'رقم الفاتورة مطلوب'),
  amount: money.refine((v) => Number(v) > 0, 'المبلغ يجب أن يكون أكبر من صفر'),
  invoice_date: z.string().min(1, 'التاريخ مطلوب'),
  note: z.string(),
})

export type InvoiceInput = z.infer<typeof invoiceSchema>
