import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-brand text-xl text-foreground">
            الأقساط
          </Link>
          <span className="h-5 w-px bg-foreground/15" aria-hidden="true" />
          <span className="h-2 w-2 rounded-full border border-foreground/20" aria-hidden="true" />
        </div>
        <nav className="flex items-center gap-5">
          <Link
            to="/login"
            className="text-sm text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
          >
            تسجيل الدخول
          </Link>
          <Button asChild size="sm">
            <Link to="/register">سجّل الآن</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
