import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { NotFound } from '@/components/layout/NotFound'
import { HomeRoute } from '@/features/marketing/components/HomeRoute'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { RegisterRoute } from '@/features/auth/components/RegisterRoute'
import { TeamPage } from '@/features/auth/components/TeamPage'
import { RequireAuth, RequireOwner, RoleLanding } from '@/features/auth/components/guards'
import { CustomersPage } from '@/features/customers/components/CustomersPage'
import { CustomerFormPage } from '@/features/customers/components/CustomerFormPage'
import { CustomerDetailPage } from '@/features/customers/components/CustomerDetailPage'
import { CollectPage } from '@/features/payments/components/CollectPage'
import { DashboardPage } from '@/features/dashboard/components/DashboardPage'
import { CapitalPage } from '@/features/dashboard/components/CapitalPage'
import { SuppliersPage } from '@/features/suppliers/components/SuppliersPage'
import { SupplierDetailPage } from '@/features/suppliers/components/SupplierDetailPage'

export const router = createBrowserRouter([
  { path: '/', element: <HomeRoute /> },
  { path: '/register', element: <RegisterRoute /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: 'dashboard', element: <RoleLanding owner={<DashboardPage />} /> },
          { path: 'customers', element: <CustomersPage /> },
          { path: 'customers/:id', element: <CustomerDetailPage /> },
          { path: 'collect', element: <CollectPage /> },
          {
            element: <RequireOwner />,
            children: [
              { path: 'customers/new', element: <CustomerFormPage mode="create" /> },
              { path: 'customers/:id/edit', element: <CustomerFormPage mode="edit" /> },
              { path: 'suppliers', element: <SuppliersPage /> },
              { path: 'suppliers/:id', element: <SupplierDetailPage /> },
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
