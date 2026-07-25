import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { NotFound } from '@/components/layout/NotFound'
import { EmptyState } from '@/components/shared/states'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { TeamPage } from '@/features/auth/components/TeamPage'
import { RequireAuth, RequireOwner, RoleLanding } from '@/features/auth/components/guards'

function Placeholder({ title }: { title: string }) {
  return <EmptyState title={title} description="هذه الصفحة قيد الإنشاء" />
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <RoleLanding owner={<Placeholder title="الرئيسية" />} /> },
          { path: 'customers', element: <Placeholder title="العملاء" /> },
          { path: 'collect', element: <Placeholder title="تسجيل دفعة" /> },
          {
            element: <RequireOwner />,
            children: [
              { path: 'suppliers', element: <Placeholder title="التجار" /> },
              { path: 'capital', element: <Placeholder title="رأس المال" /> },
              { path: 'team', element: <TeamPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
])
