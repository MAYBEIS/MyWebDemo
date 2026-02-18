import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { ArticleContent } from "@/components/article-content"
import { ArticleComments } from "@/components/article-comments"

export const metadata = {
  title: "文章详情 | SysLog",
  description: "阅读系统编程深度技术文章。",
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-3xl">
          <ArticleContent slug={slug} />
          <ArticleComments />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
