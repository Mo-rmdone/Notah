import { motion, useReducedMotion, type Variants } from 'motion/react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// شريط أداء توضيحي بنفس ألوان الحالة الحقيقية في PerformanceWidget، لكن ببيانات
// ثابتة — معاينة صادقة للمنتج الفعلي بدل رسم توضيحي مخترع.
// A demo status strip using the real status colors from PerformanceWidget, with
// static data — an honest preview of the real product, not an invented graphic.
const demoMonths = [
  { label: 'فبراير', status: 'paid' as const },
  { label: 'مارس', status: 'paid' as const },
  { label: 'أبريل', status: 'partial' as const },
  { label: 'مايو', status: 'paid' as const },
  { label: 'يونيو', status: 'missed' as const },
  { label: 'يوليو', status: 'paid' as const },
]

const statusStyles: Record<string, string> = {
  paid: 'bg-status-paid-bg text-status-paid',
  partial: 'bg-status-partial-bg text-status-partial',
  missed: 'bg-status-missed-bg text-status-missed',
}

const capabilities = ['عملاء وعقود', 'تسجيل الدفعات', 'فريق التحصيل', '+']

function heroVariants(reduce: boolean | null): { container: Variants; item: Variants } {
  if (reduce) {
    return {
      container: { hidden: {}, show: {} },
      item: { hidden: {}, show: {} },
    }
  }
  return {
    container: {
      hidden: {},
      show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
    },
    item: {
      hidden: { opacity: 0, y: 16 },
      show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    },
  }
}

export function Hero() {
  const shouldReduceMotion = useReducedMotion()
  const { container, item } = heroVariants(shouldReduceMotion)

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-8 sm:px-6">
      <motion.div variants={container} initial="hidden" animate="show" className="mx-auto max-w-6xl">
        {/* البطاقة الرئيسية مع توهج خلفي ناعم — صدى بسيط لكرة mdx.so بلا الحاجة لأصول ثلاثية الأبعاد */}
        <motion.div variants={item} className="relative flex justify-center py-10 sm:py-16">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl sm:h-[28rem] sm:w-[28rem]"
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--accent-foreground) 35%, transparent) 0%, transparent 70%)',
            }}
          />
          <Card className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl border-foreground/10 p-0 shadow-xl">
            <div className="border-b border-border/10 p-4">
              <p className="font-semibold text-foreground">أحمد محمد</p>
              <p className="text-xs text-muted-foreground">المتبقي: ٣٬٢٠٠ ج.م — قسط ٤٠٠ ج.م</p>
            </div>
            <div className="flex overflow-hidden">
              {demoMonths.map((month, index) => (
                <div
                  key={month.label}
                  className={cn(
                    'flex-1 px-1 py-4 text-center',
                    index !== demoMonths.length - 1 && 'border-e border-dashed border-border/10',
                    statusStyles[month.status],
                  )}
                >
                  <p className="truncate text-[10px] font-semibold opacity-80">{month.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* صف نصي غير متماثل: العنوان والدعوة للعمل من جهة، الوصف والقدرات من الأخرى */}
        <div className="grid gap-10 border-t border-foreground/10 pt-10 sm:grid-cols-2 sm:gap-6">
          <div>
            <motion.h1
              variants={item}
              className="font-brand text-4xl leading-tight text-foreground sm:text-5xl"
            >
              إدارة تشعر بها.
              <br />
              أقساط تُحصَّل فعلًا.
            </motion.h1>
            <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/register">
                  ابدأ مجانًا
                  <ArrowLeft />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-foreground/20">
                <Link to="/login">تسجيل الدخول</Link>
              </Button>
            </motion.div>
          </div>

          <div className="sm:pt-2">
            <motion.p variants={item} className="max-w-sm text-muted-foreground">
              سواء كان تتبع العملاء، أو تسجيل الدفعات، أو متابعة فريق التحصيل —{' '}
              <span className="text-foreground">نصمم أدوات يشعر بها أصحاب المحلات</span>، لا مجرد
              دفتر رقمي.
            </motion.p>
            <motion.div variants={item} className="mt-4 flex flex-wrap gap-2">
              {capabilities.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-foreground/25 px-3.5 py-1.5 text-xs font-medium text-foreground"
                >
                  {label}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
