import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { DailyQuiz } from "@/components/daily-quiz"

export const metadata = {
  title: "每日挑战 | SysLog",
  description: "每天 5 道系统编程题目，测试你对内核、网络、编译器等领域的掌握程度。",
}

export default function QuizPage() {
  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-14">
            <span className="text-xs font-mono text-primary/60 mb-3 block tracking-wider uppercase">{"// daily challenge"}</span>
            <h1 className="text-4xl font-bold text-foreground mb-4">每日挑战</h1>
            <p className="text-muted-foreground/60 max-w-lg leading-relaxed">
              每天精选 5 道系统编程题目，限时作答，挑战你的底层知识极限。
            </p>
          </div>
          <DailyQuiz />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
