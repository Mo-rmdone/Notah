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
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
      >
        <div>
          <motion.span
            variants={item}
            className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
          >
            لأصحاب محلات التقسيط
          </motion.span>
          <motion.h1
            variants={item}
            className="mt-4 text-4xl font-extrabold leading-tight text-foreground sm:text-5xl"
          >
            إدارة أقساط عملائك
            <br />
            من مكان واحد
          </motion.h1>
          <motion.p variants={item} className="mt-4 max-w-md text-lg text-muted-foreground">
            سجّل عملاءك، وتابع التحصيل يوميًا، واعرف حالة كل قسط لحظة بلحظة — بدون دفاتر ورقية
            ولا حسابات معقدة.
          </motion.p>
          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/register">
                ابدأ مجانًا
                <ArrowLeft />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">تسجيل الدخول</Link>
            </Button>
          </motion.div>
        </div>

        <motion.div variants={item}>
          <Card className="mx-auto max-w-sm overflow-hidden p-0 shadow-lg">
            <div className="border-b border-border p-4">
              <p className="font-semibold text-foreground">أحمد محمد</p>
              <p className="text-xs text-muted-foreground">المتبقي: ٣٬٢٠٠ ج.م — قسط ٤٠٠ ج.م</p>
            </div>
            <div className="flex overflow-hidden">
              {demoMonths.map((month, index) => (
                <div
                  key={month.label}
                  className={cn(
                    'flex-1 px-1 py-4 text-center',
                    index !== demoMonths.length - 1 && 'border-e border-dashed border-border',
                    statusStyles[month.status],
                  )}
                >
                  <p className="truncate text-[10px] font-semibold opacity-80">{month.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </section>
  )
}
