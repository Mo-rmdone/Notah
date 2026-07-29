import { Navigate } from 'react-router-dom'
import { LoadingState } from '@/components/shared/states'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { HomePage } from '@/features/marketing/components/HomePage'

// زائر مسجَّل الدخول يُحوَّل مباشرة للتطبيق بدل رؤية الصفحة التسويقية مرة أخرى.
// A logged-in visitor is redirected straight into the app instead of seeing the
// marketing page again.
export function HomeRoute() {
  const { session, loading } = useAuth()
  if (loading) return <LoadingState className="min-h-svh" />
  if (session) return <Navigate to="/dashboard" replace />
  return <HomePage />
}
