import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { isSupabaseConfigured } from '@/lib/supabase'
import { AuthProvider } from '@/features/auth/hooks/useAuth'
import { Toaster } from '@/components/ui/sonner'
import { router } from '@/routes/router'

function ConfigMissing() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-brand text-4xl text-primary">الأقساط</h1>
      <p className="max-w-md font-semibold">
        إعدادات Supabase غير مكتملة
      </p>
      <p className="max-w-md text-sm text-muted-foreground" dir="rtl">
        أنشئ ملف <code dir="ltr" className="rounded bg-muted px-1">.env</code> وأضف فيه{' '}
        <code dir="ltr" className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> و{' '}
        <code dir="ltr" className="rounded bg-muted px-1">VITE_SUPABASE_ANON_KEY</code> ثم أعد تشغيل
        التطبيق — راجع ملف README.
      </p>
    </div>
  )
}

function App() {
  if (!isSupabaseConfigured) {
    return <ConfigMissing />
  }
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
