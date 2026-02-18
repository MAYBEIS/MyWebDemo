import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { AboutHero } from "@/components/about-hero"
import { Timeline } from "@/components/timeline"
import { TechStack } from "@/components/tech-stack"

export const metadata = {
  title: "关于 | SysLog",
  description: "系统程序员、技术写作者、开源贡献者。",
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-4xl">
          <AboutHero />
          <TechStack />
          <Timeline />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
