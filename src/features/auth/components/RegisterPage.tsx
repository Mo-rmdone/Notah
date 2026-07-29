import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { signUp } from '@/features/auth/api/auth'
import { registerSchema, type RegisterInput } from '@/features/auth/schemas/auth'
import { businessSizeOptions } from '@/lib/labels'
import { arabicErrorMessage } from '@/lib/errors'

type RegisterFormValues = RegisterInput & { confirm_password: string }

export function RegisterPage() {
  const navigate = useNavigate()
  const [pendingConfirmation, setPendingConfirmation] = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      address: '',
      email: '',
      password: '',
      confirm_password: '',
      business_size: undefined as unknown as RegisterFormValues['business_size'],
    },
  })

  if (pendingConfirmation) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-sidebar p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>تم إنشاء الحساب</CardTitle>
            <CardDescription>
              تحقق من بريدك الإلكتروني لتفعيل الحساب، ثم سجّل الدخول
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login">الذهاب لتسجيل الدخول</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const { confirm_password: _confirmPassword, ...input } = values
      const { needsEmailConfirmation } = await signUp(input)
      if (needsEmailConfirmation) {
        setPendingConfirmation(true)
      } else {
        toast.success('تم إنشاء الحساب بنجاح')
        navigate('/dashboard', { replace: true })
      }
    } catch (error) {
      toast.error(arabicErrorMessage(error))
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-sidebar p-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="font-brand text-5xl text-sidebar-accent-foreground">الأقساط</h1>
        <p className="mt-2 text-sm text-sidebar-foreground">أنشئ حسابك وابدأ إدارة أقساطك اليوم</p>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>إنشاء حساب جديد</CardTitle>
          <CardDescription>أدخل بيانات محلك لإنشاء حسابك كمالك</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم الكامل</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input
                        dir="ltr"
                        type="tel"
                        placeholder="01xxxxxxxxx"
                        autoComplete="tel"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العنوان</FormLabel>
                    <FormControl>
                      <Textarea rows={2} autoComplete="street-address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="business_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حجم النشاط</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="اختر حجم النشاط" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {businessSizeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input type="email" dir="ltr" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        dir="ltr"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تأكيد كلمة المرور</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        dir="ltr"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  'إنشاء الحساب'
                )}
              </Button>
            </form>
          </Form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            لديك حساب بالفعل؟{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              سجّل الدخول
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
