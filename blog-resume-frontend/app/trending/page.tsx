import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { TrendingTopics } from "@/components/trending-topics"

export const metadata = {
  title: "每日热榜 | SysLog",
  description: "每天的系统编程热门话题投票，参与讨论你最关注的技术趋势。",
}

export default function TrendingPage() {
  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14">
            <span className="text-xs font-mono text-primary/60 mb-3 block tracking-wider uppercase">{"// trending"}</span>
            <h1 className="text-4xl font-bold text-foreground mb-4">每日热榜</h1>
            <p className="text-muted-foreground/60 max-w-lg leading-relaxed">
              为你关注的系统编程话题投票，看看社区中大家最感兴趣的技术方向。每天更新，参与讨论。
            </p>
          </div>
          <TrendingTopics />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
