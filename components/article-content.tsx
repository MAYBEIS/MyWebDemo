"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Clock, Eye, Calendar, Share2, Heart, Bookmark } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-store"

// 文章数据类型
interface ArticleData {
  id: string
  title: string
  content: string
  excerpt?: string
  category?: string
  coverImage?: string
  tags: string[]
  author: string
  createdAt: string
  updatedAt: string
  views: number
  likes: number
  liked: boolean
  bookmarked: boolean
}

interface ArticleContentProps {
  slug: string
  articleData?: ArticleData
}

// 默认静态数据（当没有从后端获取数据时使用）
const articleDataStatic: Record<string, {
  title: string
  date: string
  readTime: string
  views: string
  likes: number
  tags: string[]
  content: { type: "heading" | "paragraph" | "code"; text: string; lang?: string }[]
}> = {
  "linux-kernel-memory-management": {
    title: "深入 Linux 内核内存管理机制",
    date: "2026 年 1 月 15 日",
    readTime: "12 分钟阅读",
    views: "2,400",
    likes: 128,
    tags: ["Linux", "内核", "内存"],
    content: [
      { type: "heading", text: "引言" },
      { type: "paragraph", text: "Linux 内核的内存管理子系统是其最复杂且最关键的组件之一。它负责处理从物理页面分配到虚拟地址空间管理的所有工作，确保系统上运行的所有进程都能高效且安全地访问内存。" },
      { type: "paragraph", text: "在这篇文章中，我们将探索使 Linux 内存管理得以工作的关键数据结构和算法。" },
      { type: "heading", text: "虚拟内存架构" },
      { type: "paragraph", text: "Linux 使用多级页表系统将虚拟地址翻译为物理地址。在 x86_64 架构上，这涉及四个级别的页表：" },
      { type: "code", lang: "c", text: "// 简化的页表遍历\npgd_t *pgd = pgd_offset(mm, address);\np4d_t *p4d = p4d_offset(pgd, address);\npud_t *pud = pud_offset(p4d, address);\npmd_t *pmd = pmd_offset(pud, address);\npte_t *pte = pte_offset_kernel(pmd, address);" },
      { type: "paragraph", text: "页表的每一级将虚拟地址空间划分为逐渐更小的区域，最终的 PTE（页表项）指向实际的物理页帧。" },
      { type: "heading", text: "Buddy 分配器" },
      { type: "paragraph", text: "在最底层，Linux 使用 buddy 分配器管理物理页面。该算法维护按阶（2 的幂次方页面数）组织的空闲链表：" },
      { type: "code", lang: "c", text: "struct free_area {\n    struct list_head free_list[MIGRATE_TYPES];\n    unsigned long nr_free;\n};\n\nstruct zone {\n    struct free_area free_area[MAX_ORDER];\n    // ...\n};" },
      { type: "paragraph", text: "当一个页面被释放时，buddy 分配器会尝试将其与其「伙伴」——相邻的同等大小的块——合并，形成更大的空闲块。" },
      { type: "heading", text: "SLAB 分配器" },
      { type: "paragraph", text: "对于小于一个页面的分配请求，Linux 使用 SLAB（或 SLUB/SLOB）分配器。它建立在 buddy 分配器之上，为频繁分配的对象大小提供高效的缓存：" },
      { type: "code", lang: "c", text: "struct kmem_cache *my_cache = kmem_cache_create(\n    \"my_objects\",\n    sizeof(struct my_object),\n    0,\n    SLAB_HWCACHE_ALIGN,\n    NULL\n);\n\nstruct my_object *obj = kmem_cache_alloc(my_cache, GFP_KERNEL);" },
      { type: "heading", text: "总结" },
      { type: "paragraph", text: "理解 Linux 内存管理对于任何从事内核开发、性能优化或系统编程的人来说都是必不可少的。从 buddy 分配器到 SLAB 缓存再到虚拟内存管理的分层架构，提供了一个复杂且高效的物理和虚拟内存管理系统。" },
    ],
  },
}

const defaultStaticArticle = {
  title: "技术文章",
  date: "2026 年",
  readTime: "10 分钟阅读",
  views: "1,000",
  likes: 42,
  tags: ["系统", "编程"],
  content: [
    { type: "heading" as const, text: "概述" },
    { type: "paragraph" as const, text: "这是一篇深入探讨系统编程概念的技术文章。内容涵盖底层实现细节、性能考量以及编写高效系统软件的最佳实践。" },
    { type: "heading" as const, text: "核心概念" },
    { type: "paragraph" as const, text: "系统编程需要对硬件、操作系统以及两者之间的接口有深入理解。从内存管理到进程调度，在这个层面上工作时每一个细节都至关重要。" },
    { type: "code" as const, lang: "c", text: "#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    printf(\"Hello, systems programming!\\n\");\n    return 0;\n}" },
    { type: "heading" as const, text: "总结" },
    { type: "paragraph" as const, text: "掌握系统编程能让你理解软件在最基础层面上是如何运作的。" },
  ],
}

// 格式化日期
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

// 格式化阅读时间
function formatReadTime(content: string): string {
  // 简单估算：每 200 个字符约 1 分钟
  const wordsPerMinute = 200
  const textLength = content.replace(/[#*`\[\]]/g, '').length
  const minutes = Math.ceil(textLength / wordsPerMinute)
  return `${minutes} 分钟阅读`
}

export function ArticleContent({ slug, articleData }: ArticleContentProps) {
  // 如果有从服务端获取的文章数据，使用它
  const hasServerData = !!articleData
  
  const [liked, setLiked] = useState(articleData?.liked || false)
  const [bookmarked, setBookmarked] = useState(articleData?.bookmarked || false)
  const [likeCount, setLikeCount] = useState(articleData?.likes || 0)
  const [isLoading, setIsLoading] = useState(false)
  const { isLoggedIn } = useAuth()

  // 处理点赞
  const handleLike = async () => {
    if (!isLoggedIn) {
      toast.error("请先登录后再点赞")
      return
    }
    
    if (isLoading) return
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/posts/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like' }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setLiked(result.data.liked)
        setLikeCount(result.data.likes)
        toast.success(result.data.liked ? "已点赞！" : "已取消点赞")
      } else {
        toast.error(result.error || "操作失败")
      }
    } catch (error) {
      console.error("点赞失败:", error)
      toast.error("点赞失败")
    } finally {
      setIsLoading(false)
    }
  }

  // 处理收藏
  const handleBookmark = async () => {
    if (!isLoggedIn) {
      toast.error("请先登录后再收藏")
      return
    }
    
    if (isLoading) return
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/posts/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bookmark' }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setBookmarked(result.data.bookmarked)
        toast.success(result.data.bookmarked ? "已收藏！" : "已取消收藏")
      } else {
        toast.error(result.error || "操作失败")
      }
    } catch (error) {
      console.error("收藏失败:", error)
      toast.error("收藏失败")
    } finally {
      setIsLoading(false)
    }
  }

  // 处理分享
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success("链接已复制到剪贴板")
  }

  // 如果有服务端数据，渲染动态内容
  if (hasServerData && articleData) {
    return (
      <article>
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-primary transition-colors duration-300 mb-10 group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
          返回文章列表
        </Link>

        <header className="mb-10">
          <div className="flex flex-wrap gap-2 mb-5">
            {articleData.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-primary/8 text-primary border-primary/15 text-xs font-mono">
                {tag}
              </Badge>
            ))}
          </div>

          <h1 className="text-3xl font-bold text-foreground leading-tight sm:text-4xl lg:text-[2.5rem] text-balance">
            {articleData.title}
          </h1>

          <div className="flex items-center gap-5 mt-7 flex-wrap">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border/50">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-mono">
                  {articleData.author.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{articleData.author}</p>
                <p className="text-xs text-muted-foreground/50">作者</p>
              </div>
            </div>
            <Separator orientation="vertical" className="h-8 hidden sm:block bg-border/30" />
            <div className="flex items-center gap-5 text-xs text-muted-foreground/50">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(articleData.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatReadTime(articleData.content)}
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {articleData.views} 次阅读
              </span>
            </div>
          </div>
        </header>

        <Separator className="mb-10 bg-border/30" />

        {/* 文章内容 - 简单的 Markdown 渲染 */}
        <div className="space-y-6">
          {/* 将内容按行分割处理 */}
          {articleData.content.split('\n\n').map((block, i) => {
            const trimmed = block.trim()
            if (!trimmed) return null
            
            // 标题
            if (trimmed.startsWith('# ')) {
              return (
                <h2 key={i} className="text-2xl font-bold text-foreground mt-12 mb-4 first:mt-0">
                  {trimmed.slice(2)}
                </h2>
              )
            }
            if (trimmed.startsWith('## ')) {
              return (
                <h3 key={i} className="text-xl font-bold text-foreground mt-10 mb-3">
                  {trimmed.slice(3)}
                </h3>
              )
            }
            // 代码块
            if (trimmed.startsWith('```')) {
              const lines = trimmed.split('\n')
              const lang = lines[0].replace('```', '')
              const code = lines.slice(1, -1).join('\n')
              return (
                <div key={i} className="rounded-xl border border-border/40 bg-card/60 overflow-hidden my-6">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 bg-secondary/20">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-destructive/50" />
                      <div className="h-2 w-2 rounded-full bg-chart-4/50" />
                      <div className="h-2 w-2 rounded-full bg-primary/50" />
                    </div>
                    {lang && lang !== '```' && (
                      <span className="text-[10px] font-mono text-muted-foreground/40 ml-2">{lang}</span>
                    )}
                  </div>
                  <pre className="p-5 overflow-x-auto text-sm leading-relaxed">
                    <code className="font-mono text-primary/80">{code}</code>
                  </pre>
                </div>
              )
            }
            // 段落
            return (
              <p key={i} className="text-foreground/75 leading-[1.8]">
                {trimmed}
              </p>
            )
          })}
        </div>

        {/* Action bar */}
        <Separator className="mt-14 mb-6 bg-border/30" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all duration-300 ${
                liked
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/40 bg-card/30 text-muted-foreground/60 hover:text-primary hover:border-primary/20"
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              {likeCount}
            </button>
            <button
              onClick={handleBookmark}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all duration-300 ${
                bookmarked
                  ? "border-chart-4/30 bg-chart-4/10 text-chart-4"
                  : "border-border/40 bg-card/30 text-muted-foreground/60 hover:text-chart-4 hover:border-chart-4/20"
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
              {bookmarked ? "已收藏" : "收藏"}
            </button>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-sm text-muted-foreground/50 hover:text-primary transition-colors duration-300"
          >
            <Share2 className="h-4 w-4" />
            分享
          </button>
        </div>
      </article>
    )
  }

  // 回退到静态数据（当没有服务端数据时）
  const staticData = articleDataStatic[slug] || {
    ...defaultStaticArticle,
    title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }

  return (
    <article>
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-primary transition-colors duration-300 mb-10 group"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
        返回文章列表
      </Link>

      <header className="mb-10">
        <div className="flex flex-wrap gap-2 mb-5">
          {staticData.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-primary/8 text-primary border-primary/15 text-xs font-mono">
              {tag}
            </Badge>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-foreground leading-tight sm:text-4xl lg:text-[2.5rem] text-balance">
          {staticData.title}
        </h1>

        <div className="flex items-center gap-5 mt-7 flex-wrap">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border/50">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-mono">SL</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">SysLog</p>
              <p className="text-xs text-muted-foreground/50">系统程序员</p>
            </div>
          </div>
          <Separator orientation="vertical" className="h-8 hidden sm:block bg-border/30" />
          <div className="flex items-center gap-5 text-xs text-muted-foreground/50">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {staticData.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {staticData.readTime}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              {staticData.views} 次阅读
            </span>
          </div>
        </div>
      </header>

      <Separator className="mb-10 bg-border/30" />

      <div className="space-y-6">
        {staticData.content.map((block, i) => {
          if (block.type === "heading") {
            return (
              <h2 key={i} className="text-2xl font-bold text-foreground mt-12 mb-4 first:mt-0">
                {block.text}
              </h2>
            )
          }
          if (block.type === "code") {
            return (
              <div key={i} className="rounded-xl border border-border/40 bg-card/60 overflow-hidden my-6">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 bg-secondary/20">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-destructive/50" />
                    <div className="h-2 w-2 rounded-full bg-chart-4/50" />
                    <div className="h-2 w-2 rounded-full bg-primary/50" />
                  </div>
                  {block.lang && (
                    <span className="text-[10px] font-mono text-muted-foreground/40 ml-2">{block.lang}</span>
                  )}
                </div>
                <pre className="p-5 overflow-x-auto text-sm leading-relaxed">
                  <code className="font-mono text-primary/80">{block.text}</code>
                </pre>
              </div>
            )
          }
          return (
            <p key={i} className="text-foreground/75 leading-[1.8]">
              {block.text}
            </p>
          )
        })}
      </div>

      {/* Action bar */}
      <Separator className="mt-14 mb-6 bg-border/30" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all duration-300 ${
              liked
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/40 bg-card/30 text-muted-foreground/60 hover:text-primary hover:border-primary/20"
            }`}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            {likeCount}
          </button>
          <button
            onClick={handleBookmark}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all duration-300 ${
              bookmarked
                ? "border-chart-4/30 bg-chart-4/10 text-chart-4"
                : "border-border/40 bg-card/30 text-muted-foreground/60 hover:text-chart-4 hover:border-chart-4/20"
            }`}
          >
            <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
            {bookmarked ? "已收藏" : "收藏"}
          </button>
        </div>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 text-sm text-muted-foreground/50 hover:text-primary transition-colors duration-300"
        >
          <Share2 className="h-4 w-4" />
          分享
        </button>
      </div>
    </article>
  )
}
