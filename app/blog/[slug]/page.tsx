import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { ArticleContent } from "@/components/article-content"
import { ArticleComments } from "@/components/article-comments"
import prisma from "@/lib/prisma"
import { getPostInteractionStatus } from "@/lib/posts-service"
import { verifyToken } from "@/lib/auth-service"
import { cookies } from "next/headers"

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "文章详情 | SysLog",
  description: "阅读系统编程深度技术文章。",
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // 获取文章信息
  const post = await prisma.posts.findUnique({
    where: { slug },
    select: { id: true, title: true, content: true, excerpt: true, category: true, coverImage: true, createdAt: true, updatedAt: true, views: true, likes: true, published: true, authorId: true,
      users: { select: { name: true } },
      post_tags: { select: { tag: true } }
    }
  })

  if (!post) {
    return (
      <main className="min-h-screen bg-background noise-bg">
        <NavHeader />
        <div className="pt-28 pb-20 px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-2xl font-bold">文章不存在</h1>
          </div>
        </div>
        <SiteFooter />
      </main>
    )
  }

  // 从 cookies 获取当前用户
  let userId: string | null = null
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    
    if (token) {
      const user = await verifyToken(token)
      userId = user?.id || null
    }
  } catch (error) {
    // 在静态生成时 cookies() 可能失败，忽略错误
    console.log('获取 cookies 失败，可能是在静态渲染时')
  }

  // 获取当前用户的互动状态
  let liked = false
  let bookmarked = false
  
  if (userId) {
    try {
      const status = await getPostInteractionStatus(slug, userId)
      liked = status.liked
      bookmarked = status.bookmarked
    } catch (error) {
      console.log('获取互动状态失败:', error)
    }
  }

  // 格式化文章数据
  const articleData = {
    id: post.id,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt || '',
    category: post.category || '',
    coverImage: post.coverImage || '',
    tags: post.post_tags.map(t => t.tag),
    author: post.users.name,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    views: post.views,
    likes: post.likes,
    liked,
    bookmarked,
  }

  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-3xl">
          <ArticleContent slug={slug} articleData={articleData} />
          <ArticleComments postId={post.id} />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
