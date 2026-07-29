import { Navigate } from 'react-router-dom'
import { LoadingState } from '@/components/shared/states'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { RegisterPage } from '@/features/auth/components/RegisterPage'

// يمنع مالكًا مسجَّل الدخول من رؤية نموذج التسجيل مرة أخرى بزيارة /register يدويًا.
// Stops an already-logged-in owner from seeing the registration form again by
// visiting /register manually.
export function RegisterRoute() {
  const { session, loading } = useAuth()
  if (loading) return <LoadingState className="min-h-svh" />
  if (session) return <Navigate to="/dashboard" replace />
  return <RegisterPage />
}
