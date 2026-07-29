import { motion, useReducedMotion } from 'motion/react'

const steps = [
  {
    number: '١',
    title: 'سجّل بيانات محلك',
    description: 'أنشئ حسابك في دقيقة واحدة — اسمك ورقم هاتفك وعنوان محلك.',
  },
  {
    number: '٢',
    title: 'أضف عملاءك وعقودهم',
    description: 'سجّل تفاصيل كل عميل وقيمة القسط الشهري الخاص به.',
  },
  {
    number: '٣',
    title: 'تابع التحصيل يوميًا',
    description: 'سجّل الدفعات وتابع حالة كل عميل أولًا بأول.',
  },
]

export function HowItWorks() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="border-t border-foreground/10 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="font-brand text-3xl text-foreground">تبدأ في ثلاث خطوات</h2>
        <div className="mt-10 grid gap-10 sm:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : index * 0.1 }}
            >
              <span className="font-brand text-5xl text-muted-foreground">{step.number}</span>
              <h3 className="mt-3 font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
