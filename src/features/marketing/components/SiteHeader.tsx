import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="font-brand text-2xl text-primary">
          الأقساط
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/login">تسجيل الدخول</Link>
          </Button>
          <Button asChild>
            <Link to="/register">سجّل الآن</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
