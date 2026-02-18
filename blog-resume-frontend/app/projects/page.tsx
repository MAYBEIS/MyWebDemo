import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { ProjectsGrid } from "@/components/projects-grid"

export const metadata = {
  title: "项目 | SysLog",
  description: "系统编程开源项目与技术贡献。",
}

export default function ProjectsPage() {
  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14">
            <span className="text-xs font-mono text-primary/60 mb-3 block tracking-wider uppercase">{"// 项目"}</span>
            <h1 className="text-4xl font-bold text-foreground mb-4">开源项目</h1>
            <p className="text-muted-foreground/60 max-w-lg leading-relaxed">
              一系列系统编程项目、工具与实验性作品。所有代码均已开源，可在 GitHub 上查看。
            </p>
          </div>
          <ProjectsGrid />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
