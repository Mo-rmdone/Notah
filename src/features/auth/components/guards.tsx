import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState, ErrorState } from '@/components/shared/states'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useProfile } from '@/features/auth/hooks/useProfile'

export function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <LoadingState className="min-h-svh" />
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireOwner() {
  const { data: profile, isPending, isError, refetch } = useProfile()
  if (isPending) return <LoadingState />
  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (profile.role !== 'owner') return <Navigate to="/collect" replace />
  return <Outlet />
}

/** Landing gate: owners see the dashboard route, collectors go to the collect flow. */
export function RoleLanding({ owner }: { owner: React.ReactNode }) {
  const { data: profile, isPending, isError, refetch } = useProfile()
  if (isPending) return <LoadingState />
  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (profile.role !== 'owner') return <Navigate to="/collect" replace />
  return <>{owner}</>
}
