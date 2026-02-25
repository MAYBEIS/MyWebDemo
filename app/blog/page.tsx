import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { BlogList } from "@/components/blog-list"
import { RecentComments } from "@/components/recent-comments"

export const metadata = {
  title: "博客 | SysLog",
  description: "关于系统编程、内核开发和底层计算的技术文章。",
}

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14">
            <span className="text-xs font-mono text-primary/60 mb-3 block tracking-wider uppercase">{"// 博客"}</span>
            <h1 className="text-4xl font-bold text-foreground mb-4">全部文章</h1>
            <p className="text-muted-foreground/60 max-w-lg leading-relaxed">
              关于系统编程、性能工程以及底层技术细节的思考与实践记录。
            </p>
          </div>
          
          {/* 主内容区域：文章列表 + 侧边栏 */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* 文章列表 */}
            <div className="flex-1 min-w-0">
              <BlogList />
            </div>
            
            {/* 侧边栏 */}
            <div className="lg:w-72 flex-shrink-0">
              <div className="lg:sticky lg:top-28">
                <RecentComments />
              </div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
