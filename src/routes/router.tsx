import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { NotFound } from '@/components/layout/NotFound'
import { EmptyState } from '@/components/shared/states'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { TeamPage } from '@/features/auth/components/TeamPage'
import { RequireAuth, RequireOwner, RoleLanding } from '@/features/auth/components/guards'
import { CustomersPage } from '@/features/customers/components/CustomersPage'
import { CustomerFormPage } from '@/features/customers/components/CustomerFormPage'
import { CustomerDetailPage } from '@/features/customers/components/CustomerDetailPage'
import { CollectPage } from '@/features/payments/components/CollectPage'
import { DashboardPage } from '@/features/dashboard/components/DashboardPage'
import { CapitalPage } from '@/features/dashboard/components/CapitalPage'

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
          { index: true, element: <RoleLanding owner={<DashboardPage />} /> },
          { path: 'customers', element: <CustomersPage /> },
          { path: 'customers/:id', element: <CustomerDetailPage /> },
          { path: 'collect', element: <CollectPage /> },
          {
            element: <RequireOwner />,
            children: [
              { path: 'customers/new', element: <CustomerFormPage mode="create" /> },
              { path: 'customers/:id/edit', element: <CustomerFormPage mode="edit" /> },
              { path: 'suppliers', element: <Placeholder title="التجار" /> },
              { path: 'capital', element: <CapitalPage /> },
              { path: 'team', element: <TeamPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
])
