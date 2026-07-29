import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'البريد الإلكتروني مطلوب').email('بريد إلكتروني غير صحيح'),
  password: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    full_name: z.string().min(1, 'الاسم مطلوب'),
    phone: z.string().regex(/^01[0-9]{9}$/, 'رقم الهاتف بصيغة 01xxxxxxxxx'),
    address: z.string().min(1, 'العنوان مطلوب'),
    email: z.string().min(1, 'البريد الإلكتروني مطلوب').email('بريد إلكتروني غير صحيح'),
    password: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل'),
    confirm_password: z.string(),
    business_size: z.enum(['individual', 'small', 'medium', 'large'], {
      error: 'يجب اختيار حجم النشاط',
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'كلمات المرور غير متطابقة',
    path: ['confirm_password'],
  })

export type RegisterInput = Omit<z.infer<typeof registerSchema>, 'confirm_password'>

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

export const collectorSchema = z.object({
  full_name: z.string().min(1, 'اسم المحصّل مطلوب'),
  email: z.string().min(1, 'البريد الإلكتروني مطلوب').email('بريد إلكتروني غير صحيح'),
  phone: z
    .string()
    .regex(/^01[0-9]{9}$/, 'رقم الهاتف بصيغة 01xxxxxxxxx')
    .or(z.literal('')),
})

export type CollectorInput = z.infer<typeof collectorSchema>
