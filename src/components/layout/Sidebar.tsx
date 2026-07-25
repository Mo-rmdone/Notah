import { NavLink, useNavigate } from 'react-router-dom'
import {
  HandCoins,
  LayoutDashboard,
  Loader2,
  LogOut,
  Store,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { signOut } from '@/features/auth/api/auth'
import { useProfile } from '@/features/auth/hooks/useProfile'
import { useUiStore } from '@/stores/ui'
import { arabicErrorMessage } from '@/lib/errors'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard, ownerOnly: true, end: true },
  { to: '/customers', label: 'العملاء', icon: Users, ownerOnly: false, end: false },
  { to: '/collect', label: 'تسجيل دفعة', icon: HandCoins, ownerOnly: false, end: false },
  { to: '/suppliers', label: 'التجار', icon: Store, ownerOnly: true, end: false },
  { to: '/capital', label: 'رأس المال', icon: Wallet, ownerOnly: true, end: false },
  { to: '/team', label: 'الفريق', icon: UserCog, ownerOnly: true, end: false },
]

function SidebarContent() {
  const { data: profile } = useProfile()
  const closeSidebar = useUiStore((s) => s.closeSidebar)
  const navigate = useNavigate()
  const isOwner = profile?.role === 'owner'

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(arabicErrorMessage(error))
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-6 py-5">
        <p className="font-brand text-3xl leading-relaxed text-sidebar-accent-foreground">الأقساط</p>
        <p className="mt-1 text-xs text-sidebar-foreground/70">إدارة الأقساط والتحصيل</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {profile ? (
          navItems
            .filter((item) => isOwner || !item.ownerOnly)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </NavLink>
            ))
        ) : (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-sidebar-foreground/60" />
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 min-w-0">
          <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">
            {profile?.full_name || '—'}
          </p>
          <p className="text-xs text-sidebar-foreground/70">
            {profile?.role === 'owner' ? 'مالك' : 'محصّل'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  )
}

export function DesktopSidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 bg-sidebar md:block">
      <SidebarContent />
    </aside>
  )
}

export function MobileSidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const closeSidebar = useUiStore((s) => s.closeSidebar)

  if (!sidebarOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="إغلاق القائمة"
        className="absolute inset-0 bg-black/60"
        onClick={closeSidebar}
      />
      <div className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-sidebar shadow-xl">
        <button
          type="button"
          aria-label="إغلاق القائمة"
          onClick={closeSidebar}
          className="absolute end-3 top-4 rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </div>
    </div>
  )
}
