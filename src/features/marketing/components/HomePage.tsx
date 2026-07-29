import { SiteHeader } from '@/features/marketing/components/SiteHeader'
import { Hero } from '@/features/marketing/components/Hero'
import { Features } from '@/features/marketing/components/Features'
import { HowItWorks } from '@/features/marketing/components/HowItWorks'
import { CtaFooter } from '@/features/marketing/components/CtaFooter'

export function HomePage() {
  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
      </main>
      <CtaFooter />
    </div>
  )
}
