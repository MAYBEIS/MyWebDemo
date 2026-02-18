import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { BlogList } from "@/components/blog-list"

export const metadata = {
  title: "博客 | SysLog",
  description: "关于系统编程、内核开发和底层计算的技术文章。",
}

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14">
            <span className="text-xs font-mono text-primary/60 mb-3 block tracking-wider uppercase">{"// 博客"}</span>
            <h1 className="text-4xl font-bold text-foreground mb-4">全部文章</h1>
            <p className="text-muted-foreground/60 max-w-lg leading-relaxed">
              关于系统编程、性能工程以及底层技术细节的思考与实践记录。
            </p>
          </div>
          <BlogList />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
