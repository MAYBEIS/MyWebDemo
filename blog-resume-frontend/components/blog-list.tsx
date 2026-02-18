"use client"

import { useState } from "react"
import Link from "next/link"
import { Clock, Eye, Heart, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const allPosts = [
  {
    slug: "linux-kernel-memory-management",
    title: "深入 Linux 内核内存管理机制",
    excerpt: "探索虚拟内存子系统、页表结构与 Linux 内核中的内存分配策略。",
    date: "2026-01-15",
    readTime: "12 分钟",
    views: "2.4k",
    likes: 128,
    tags: ["Linux", "内核", "内存"],
    category: "内核",
  },
  {
    slug: "building-async-runtime-rust",
    title: "用 Rust 从零实现异步运行时",
    excerpt: "一步步指导你用 epoll 和 futures 在 Rust 中实现一个最小异步运行时。",
    date: "2025-12-28",
    readTime: "18 分钟",
    views: "3.1k",
    likes: 95,
    tags: ["Rust", "异步", "运行时"],
    category: "Rust",
  },
  {
    slug: "tcp-stack-implementation",
    title: "实现用户态 TCP 协议栈",
    excerpt: "如何使用 raw sockets 和 TUN/TAP 接口在用户态构建一个最小化 TCP/IP 协议栈。",
    date: "2025-12-10",
    readTime: "15 分钟",
    views: "1.8k",
    likes: 72,
    tags: ["网络", "C", "TCP"],
    category: "网络",
  },
  {
    slug: "compiler-optimization-passes",
    title: "编写自定义 LLVM 优化 Pass",
    excerpt: "用实际案例讲解如何扩展 LLVM 编译器基础设施，编写自定义优化 Pass。",
    date: "2025-11-22",
    readTime: "10 分钟",
    views: "1.2k",
    likes: 56,
    tags: ["编译器", "LLVM", "C++"],
    category: "编译器",
  },
  {
    slug: "ebpf-observability",
    title: "eBPF 系统可观测性：进阶实战",
    excerpt: "使用 eBPF 程序实现高级系统追踪、性能分析与实时性能监控。",
    date: "2025-11-05",
    readTime: "14 分钟",
    views: "2.0k",
    likes: 88,
    tags: ["eBPF", "Linux", "可观测性"],
    category: "Linux",
  },
  {
    slug: "lock-free-data-structures",
    title: "无锁数据结构实战指南",
    excerpt: "使用原子操作与内存序语义实现并发哈希映射和队列。",
    date: "2025-10-18",
    readTime: "16 分钟",
    views: "2.7k",
    likes: 110,
    tags: ["并发", "C++", "原子操作"],
    category: "并发",
  },
  {
    slug: "io-uring-file-server",
    title: "基于 io_uring 构建高性能文件服务器",
    excerpt: "利用 Linux io_uring 异步 I/O 接口构建高性能文件服务器。",
    date: "2025-09-30",
    readTime: "11 分钟",
    views: "1.5k",
    likes: 64,
    tags: ["io_uring", "Linux", "性能"],
    category: "Linux",
  },
  {
    slug: "rust-unsafe-patterns",
    title: "Unsafe Rust 的安全编码模式",
    excerpt: "编写健壮 unsafe Rust 代码的最佳实践与常见模式。",
    date: "2025-09-12",
    readTime: "13 分钟",
    views: "3.8k",
    likes: 142,
    tags: ["Rust", "Unsafe", "模式"],
    category: "Rust",
  },
]

const categories = ["全部", ...Array.from(new Set(allPosts.map((p) => p.category)))]

export function BlogList() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("全部")

  const filteredPosts = allPosts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(search.toLowerCase()) ||
      post.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = activeCategory === "全部" || post.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div>
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
                    {post.excerpt}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground/40 font-mono whitespace-nowrap sm:ml-6 sm:mt-1">
                  {post.date}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                  <Clock className="h-3 w-3" />
                  {post.readTime}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                  <Eye className="h-3 w-3" />
                  {post.views}
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

        {filteredPosts.length === 0 && (
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
