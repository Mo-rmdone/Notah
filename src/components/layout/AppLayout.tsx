import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { DesktopSidebar, MobileSidebar } from '@/components/layout/Sidebar'
import { useUiStore } from '@/stores/ui'

export function AppLayout() {
  const openSidebar = useUiStore((s) => s.openSidebar)

  return (
    <div className="min-h-svh md:flex">
      <DesktopSidebar />
      <MobileSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-sidebar px-4 py-3 md:hidden">
          <button
            type="button"
            aria-label="فتح القائمة"
            onClick={openSidebar}
            className="rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-brand text-2xl text-sidebar-accent-foreground">الأقساط</span>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
