"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Clock, Eye, Heart, Search, X, Loader2, ArrowUpDown, MessageCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fetchPosts, fetchCategories, formatDate, formatLastCommentTime, formatViews, type Post } from "@/lib/api-posts"

// 排序选项类型
type SortOption = 'createdAt' | 'lastCommentAt' | 'views'

// 排序选项配置
const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'createdAt', label: '发布时间' },
  { value: 'lastCommentAt', label: '最近评论' },
  { value: 'views', label: '阅读量' },
]

export function BlogList() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("全部")
  const [sortBy, setSortBy] = useState<SortOption>('createdAt')
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

  // 搜索、分类、排序变化时重新加载文章
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      try {
        setLoading(true)
        // 当选择"全部"或没有搜索词时，获取所有文章
        const category = activeCategory === "全部" ? undefined : activeCategory
        const result = await fetchPosts({ 
          page: 1, 
          limit: 20, 
          search: search || undefined,
          category,
          sortBy
        })
        setPosts(result.posts)
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(delaySearch)
  }, [search, activeCategory, sortBy])

  // 获取要显示的文章（已经过 API 筛选）
  const displayPosts = posts

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
      <div className="flex flex-wrap gap-2 mb-6">
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

      {/* 排序选项 */}
      <div className="flex items-center gap-2 mb-10">
        <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />
        <span className="text-xs text-muted-foreground/60 mr-2">排序：</span>
        <div className="flex gap-1">
          {sortOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              onClick={() => setSortBy(option.value)}
              className={`h-7 px-3 text-xs font-mono transition-all duration-300 ${
                sortBy === option.value
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-card/40"
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 加载指示器 */}
      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* 文章列表 */}
      <div className="flex flex-col gap-3">
        {displayPosts.map((post) => (
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
                   {formatLastCommentTime(post.lastCommentAt)}
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

        {displayPosts.length === 0 && !loading && (
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
