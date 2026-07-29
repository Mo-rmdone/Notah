import { motion, useReducedMotion } from 'motion/react'
import { HandCoins, LayoutDashboard, UserCog, Users } from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'عملاء وعقود',
    description: 'سجّل بيانات كل عميل وعقوده، مع حساب المتبقي والقسط الشهري تلقائيًا.',
  },
  {
    icon: HandCoins,
    title: 'تسجيل الدفعات',
    description: 'سجّل كل دفعة في ثوانٍ، ويُحدَّث المتبقي والتقارير فورًا.',
  },
  {
    icon: UserCog,
    title: 'فريق التحصيل',
    description: 'أضف محصّلين لفريقك وتابع أداءهم من مكان واحد.',
  },
  {
    icon: LayoutDashboard,
    title: 'متابعة الأداء',
    description: 'اعرف حالة سداد كل عميل بنظرة واحدة — مدفوع، جزئي، أو متأخر.',
  },
]

export function Features() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="border-t border-foreground/10 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-xl">
          <h2 className="font-brand text-3xl text-foreground">كل ما يحتاجه محلك</h2>
          <p className="mt-2 text-muted-foreground">
            أدوات بسيطة تحل محل الدفتر الورقي والحسابات اليدوية
          </p>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : index * 0.08 }}
              className="bg-background p-6"
            >
              <feature.icon className="h-5 w-5 text-accent-foreground" strokeWidth={1.5} />
              <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
