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
