import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function CtaFooter() {
  return (
    <>
      <section className="bg-sidebar py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-sidebar-accent-foreground">جاهز تبدأ؟</h2>
          <p className="mt-2 text-sidebar-foreground">أنشئ حسابك الآن مجانًا — بدون بطاقة ائتمان</p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/register">إنشاء حساب مجاني</Link>
          </Button>
        </div>
      </section>
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span className="font-brand text-xl text-primary">الأقساط</span>
          <nav className="flex items-center gap-4">
            <Link to="/login" className="hover:text-foreground hover:underline">
              تسجيل الدخول
            </Link>
            <Link to="/register" className="hover:text-foreground hover:underline">
              إنشاء حساب
            </Link>
          </nav>
        </div>
      </footer>
    </>
  )
}
