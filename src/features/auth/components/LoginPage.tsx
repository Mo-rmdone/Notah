import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { LoadingState } from '@/components/shared/states'
import { signIn } from '@/features/auth/api/auth'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { loginSchema, type LoginInput } from '@/features/auth/schemas/auth'
import { arabicErrorMessage } from '@/lib/errors'

export function LoginPage() {
  const { session, loading } = useAuth()

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (loading) return <LoadingState className="min-h-svh" />
  if (session) return <Navigate to="/" replace />

  const onSubmit = async (values: LoginInput) => {
    try {
      await signIn(values)
    } catch (error) {
      toast.error(arabicErrorMessage(error))
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-sidebar p-4">
      <div className="mb-8 text-center">
        <h1 className="font-brand text-5xl text-sidebar-accent-foreground">الأقساط</h1>
        <p className="mt-2 text-sm text-sidebar-foreground">نظام إدارة الأقساط والتحصيل</p>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>تسجيل الدخول</CardTitle>
          <CardDescription>ادخل بياناتك للوصول إلى النظام</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                      <Input type="password" dir="ltr" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  'دخول'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
