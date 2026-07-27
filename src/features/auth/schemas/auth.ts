import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'البريد الإلكتروني مطلوب').email('بريد إلكتروني غير صحيح'),
  password: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1, 'الاسم مطلوب'),
  phone: z
    .string()
    .regex(/^01[0-9]{9}$/, 'رقم الهاتف بصيغة 01xxxxxxxxx')
    .or(z.literal('')),
  role: z.enum(['owner', 'collector']),
  active: z.enum(['active', 'suspended']),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

// كلمة المرور ليست حقلًا هنا: الخادم يولّدها ويعيدها مرة واحدة، فلا يختار
// المالك كلمة ضعيفة ولا تمر عبر النموذج أصلًا.
// No password field: the server generates one and returns it once, so the owner
// cannot pick a weak one and it never travels through this form.
export const collectorSchema = z.object({
  full_name: z.string().min(1, 'اسم المحصّل مطلوب'),
  email: z.string().min(1, 'البريد الإلكتروني مطلوب').email('بريد إلكتروني غير صحيح'),
  phone: z
    .string()
    .regex(/^01[0-9]{9}$/, 'رقم الهاتف بصيغة 01xxxxxxxxx')
    .or(z.literal('')),
})

export type CollectorInput = z.infer<typeof collectorSchema>
