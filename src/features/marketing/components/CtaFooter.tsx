import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function CtaFooter() {
  return (
    <>
      <section className="border-t border-foreground/10 py-20">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="font-brand text-4xl text-foreground">جاهز تبدأ؟</h2>
          <p className="mt-2 text-muted-foreground">أنشئ حسابك الآن مجانًا — بدون بطاقة ائتمان</p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/register">إنشاء حساب مجاني</Link>
          </Button>
        </div>
      </section>
      <footer className="border-t border-foreground/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span className="font-brand text-lg text-foreground">الأقساط</span>
          <nav className="flex items-center gap-4">
            <Link
              to="/login"
              className="underline decoration-foreground/20 underline-offset-4 hover:text-foreground hover:decoration-foreground"
            >
              تسجيل الدخول
            </Link>
            <Link
              to="/register"
              className="underline decoration-foreground/20 underline-offset-4 hover:text-foreground hover:decoration-foreground"
            >
              إنشاء حساب
            </Link>
          </nav>
        </div>
      </footer>
    </>
  )
}
