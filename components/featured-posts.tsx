"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Clock, Eye, Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useInView } from "@/hooks/use-in-view"
import { fetchFeaturedPosts, formatDate, formatLastCommentTime, formatViews, type Post } from "@/lib/api-posts"

export function FeaturedPosts() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { threshold: 0.1 })
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // 从 API 获取文章数据
    async function loadPosts() {
      try {
        const data = await fetchFeaturedPosts(4)
        setPosts(data)
      } catch (err) {
        console.error('Failed to fetch posts:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadPosts()
  }, [])

  // 如果没有文章或加载失败，显示备用内容
  if (loading) {
    return (
      <section className="py-28 px-6 relative" ref={ref}>
        <div className={`mx-auto max-w-6xl transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="flex items-end justify-between mb-14">
            <div>
              <span className="text-xs font-mono text-primary/70 mb-3 block tracking-wider uppercase">{"// 最新文章"}</span>
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">近期文章</h2>
            </div>
            <Link
              href="/blog"
              className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-300 group sm:flex"
            >
              查看全部
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* 加载占位符 */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="lg:row-span-2">
              <div className="h-full rounded-xl border border-border/50 bg-card/40 p-8 animate-pulse">
                <div className="h-4 w-20 bg-primary/10 rounded mb-5"></div>
                <div className="h-8 bg-primary/10 rounded mb-4 w-3/4"></div>
                <div className="h-4 bg-primary/10 rounded w-full mb-2"></div>
                <div className="h-4 bg-primary/10 rounded w-2/3"></div>
              </div>
            </div>
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-card/40 p-6 animate-pulse">
                <div className="h-4 bg-primary/10 rounded w-24 mb-3"></div>
                <div className="h-6 bg-primary/10 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-primary/10 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // 如果没有文章数据，显示提示信息
  if (error || posts.length === 0) {
    return (
      <section className="py-28 px-6 relative" ref={ref}>
        <div className={`mx-auto max-w-6xl transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="flex items-end justify-between mb-14">
            <div>
              <span className="text-xs font-mono text-primary/70 mb-3 block tracking-wider uppercase">{"// 最新文章"}</span>
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">近期文章</h2>
            </div>
            <Link
              href="/blog"
              className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-300 group sm:flex"
            >
              查看全部
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="text-center py-12">
            <p className="text-muted-foreground/50 font-mono text-sm">
              {"// 暂无文章"}
            </p>
            <Link
              href="/blog"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              浏览博客
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-28 px-6 relative" ref={ref}>
      <div className={`mx-auto max-w-6xl transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="flex items-end justify-between mb-14">
          <div>
            <span className="text-xs font-mono text-primary/70 mb-3 block tracking-wider uppercase">{"// 最新文章"}</span>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">近期文章</h2>
          </div>
          <Link
            href="/blog"
            className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-300 group sm:flex"
          >
            查看全部
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* 精选文章（大卡片） */}
          <Link href={`/blog/${posts[0].slug}`} className="group lg:row-span-2">
            <article className="relative h-full rounded-xl border border-border/50 bg-card/40 p-8 transition-all duration-500 hover:border-primary/30 hover:bg-card/60 card-glow flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/[0.03] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/[0.06] transition-all duration-700" />
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-5">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
                    精选
                  </Badge>
                  <span className="text-xs text-muted-foreground/60 font-mono">{formatDate(posts[0].createdAt)}</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300 leading-tight mb-4">
                  {posts[0].title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {posts[0].excerpt || posts[0].content.substring(0, 150) + '...'}
                </p>
              </div>
              <div className="relative mt-8 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Clock className="h-3.5 w-3.5" />
                  {formatLastCommentTime(posts[0].lastCommentAt)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Eye className="h-3.5 w-3.5" />
                  {formatViews(posts[0].views)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Heart className="h-3.5 w-3.5" />
                  {posts[0].likes}
                </div>
                <div className="flex gap-2 ml-auto">
                  {posts[0].tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs font-mono text-primary/50">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </Link>

          {/* 其他文章列表 */}
          {posts.slice(1).map((post, index) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
              <article
                className="rounded-xl border border-border/50 bg-card/40 p-6 transition-all duration-500 hover:border-primary/30 hover:bg-card/60 h-full flex flex-col justify-between"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-muted-foreground/60 font-mono">{formatDate(post.createdAt)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 leading-snug mb-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {post.excerpt || post.content.substring(0, 100) + '...'}
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-4">
                   <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                     <Clock className="h-3 w-3" />
                     {formatLastCommentTime(post.lastCommentAt)}
                   </div>
                   <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                     <Eye className="h-3 w-3" />
                     {formatViews(post.views)}
                   </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                    <Heart className="h-3 w-3" />
                    {post.likes}
                  </div>
                  <div className="flex gap-2 ml-auto">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-xs font-mono text-primary/50">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
          >
            查看全部文章
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
