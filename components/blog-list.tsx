"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Clock, Eye, Heart, Search, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchPosts, fetchCategories, formatDate, calculateReadTime, formatViews, type Post } from "@/lib/api-posts"

export function BlogList() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("全部")
  const [posts, setPosts] = useState<Post[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // 加载文章和分类
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        
        // 并行加载文章和分类
        const [postsResult, categoriesResult] = await Promise.all([
          fetchPosts({ page: 1, limit: 20 }),
          fetchCategories()
        ])

        setPosts(postsResult.posts)
        setCategories(["全部", ...categoriesResult])
      } catch (err) {
        console.error('Failed to load blog data:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // 搜索防抖
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (search || activeCategory !== "全部") {
        try {
          setLoading(true)
          const category = activeCategory === "全部" ? undefined : activeCategory
          const result = await fetchPosts({ 
            page: 1, 
            limit: 20, 
            search: search || undefined,
            category
          })
          setPosts(result.posts)
        } catch (err) {
          console.error('Search failed:', err)
        } finally {
          setLoading(false)
        }
      } else if (!loading && posts.length === 0) {
        // 初始加载
        const result = await fetchPosts({ page: 1, limit: 20 })
        setPosts(result.posts)
      }
    }, 300)

    return () => clearTimeout(delaySearch)
  }, [search, activeCategory])

  // 过滤后的文章
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      (post.excerpt?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      post.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = activeCategory === "全部" || post.category === activeCategory
    return matchesSearch && matchesCategory
  })

  // 加载状态
  if (loading && posts.length === 0) {
    return (
      <div>
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="搜索文章标题、标签..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 pr-10 bg-card/40 border-border/50 focus:border-primary/40 h-12 rounded-xl transition-all duration-300"
            disabled
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-10">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-3.5 py-1.5 text-xs font-mono rounded-lg border bg-card/30 border-border/40 h-8 w-16 animate-pulse"></div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card/30 p-6 animate-pulse">
              <div className="h-6 bg-primary/10 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-primary/10 rounded w-full mb-2"></div>
              <div className="h-4 bg-primary/10 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground/50 font-mono text-sm">
          {"// 加载失败，请稍后重试"}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          刷新页面
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* 搜索框 */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          placeholder="搜索文章标题、标签..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 pr-10 bg-card/40 border-border/50 focus:border-primary/40 h-12 rounded-xl transition-all duration-300"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
            aria-label="清除搜索"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2 mb-10">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 text-xs font-mono rounded-lg border transition-all duration-300 ${
              activeCategory === cat
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card/30 border-border/40 text-muted-foreground/60 hover:text-foreground hover:border-border"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 加载指示器 */}
      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* 文章列表 */}
      <div className="flex flex-col gap-3">
        {filteredPosts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
            <article className="rounded-xl border border-border/40 bg-card/30 p-6 transition-all duration-500 hover:border-primary/25 hover:bg-card/60">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 leading-snug mb-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground/70 leading-relaxed line-clamp-2">
                    {post.excerpt || post.content.substring(0, 100) + '...'}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground/40 font-mono whitespace-nowrap sm:ml-6 sm:mt-1">
                  {formatDate(post.createdAt)}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                  <Clock className="h-3 w-3" />
                  {calculateReadTime(post.content)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                  <Eye className="h-3 w-3" />
                  {formatViews(post.views)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                  <Heart className="h-3 w-3" />
                  {post.likes}
                </div>
                <div className="flex gap-2 ml-auto">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 bg-secondary/30 text-muted-foreground/50 border-border/30">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </article>
          </Link>
        ))}

        {filteredPosts.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-muted-foreground/50 font-mono text-sm">
              {"// 没有找到匹配的文章"}
            </p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("全部") }}
              className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              清除筛选条件
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
