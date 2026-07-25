import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/features/auth/hooks/useAuth'
import { Toaster } from '@/components/ui/sonner'
import { router } from '@/routes/router'

function App() {
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
