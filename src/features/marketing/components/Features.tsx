import { motion, useReducedMotion } from 'motion/react'
import { HandCoins, LayoutDashboard, UserCog, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

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
    <section className="bg-secondary/40 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold text-foreground">كل ما يحتاجه محلك</h2>
          <p className="mt-2 text-muted-foreground">أدوات بسيطة تحل محل الدفتر الورقي والحسابات اليدوية</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : index * 0.08 }}
            >
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent">
                    <feature.icon className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
