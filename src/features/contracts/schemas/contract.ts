import { z } from 'zod'
import { customerSchema } from '@/features/customers/schemas/customer'

// المبالغ تبقى نصوصًا داخل النموذج وتُحوَّل مرة واحدة عند حدود الـ API،
// وكل الحساب يتم في Postgres.
// Money stays a string through the form and is converted once at the API
// boundary; all arithmetic happens in Postgres.
const money = z
  .string()
  .min(1, 'المبلغ مطلوب')
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'مبلغ غير صحيح')

/** الشكل الخام، منفصلًا عن التحقق المركّب حتى يمكن دمجه مع نموذج العميل. */
export const contractFields = z.object({
  category: z.enum(['household', 'appliances', 'furniture'], {
    message: 'اختر نوع البضاعة',
  }),
  contract_start_date: z.string().min(1, 'تاريخ بدء العقد مطلوب'),
  payment_window: z.enum(['early', 'mid', 'late'], { message: 'اختر نافذة السداد' }),
  total_amount: money.refine((v) => Number(v) > 0, 'الإجمالي يجب أن يكون أكبر من صفر'),
  down_payment: money,
  monthly_installment: money.refine((v) => Number(v) > 0, 'القسط يجب أن يكون أكبر من صفر'),
  trust_receipt: z.enum(['yes', 'no'], { message: 'حدد وصل الأمانة' }),
  note: z.string(),
})

// نفس القيد يُطبَّق في قاعدة البيانات أيضًا (contracts_down_payment_lte_total)،
// وهذا التحقق للراحة فقط لا للأمان.
// The database enforces the same rule (contracts_down_payment_lte_total); this
// check exists for a good error message, not for safety.
function checkDownPayment(
  values: { down_payment: string; total_amount: string },
  ctx: z.RefinementCtx,
) {
  if (Number(values.down_payment) > Number(values.total_amount)) {
    ctx.addIssue({
      code: 'custom',
      path: ['down_payment'],
      message: 'المقدم لا يمكن أن يتجاوز الإجمالي',
    })
  }
}

export const contractSchema = contractFields.superRefine(checkDownPayment)

/** إنشاء عميل جديد يعني دائمًا إنشاء عقده الأول معه. */
export const customerWithContractSchema = customerSchema
  .merge(contractFields)
  .superRefine(checkDownPayment)

export type ContractInput = z.infer<typeof contractSchema>
export type CustomerWithContractInput = z.infer<typeof customerWithContractSchema>

export const contractDefaults: ContractInput = {
  category: 'household',
  contract_start_date: '',
  payment_window: 'mid',
  total_amount: '',
  down_payment: '0',
  monthly_installment: '',
  trust_receipt: 'yes',
  note: '',
}
