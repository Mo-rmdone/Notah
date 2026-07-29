import { SiteHeader } from '@/features/marketing/components/SiteHeader'
import { Hero } from '@/features/marketing/components/Hero'
import { Features } from '@/features/marketing/components/Features'
import { HowItWorks } from '@/features/marketing/components/HowItWorks'
import { CtaFooter } from '@/features/marketing/components/CtaFooter'

export function HomePage() {
  return (
    <div className="theme-mdx min-h-svh bg-background font-sans text-foreground">
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
