"use client"

import { useRef } from "react"
import Link from "next/link"
import { ArrowRight, Clock, Eye, Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useInView } from "@/hooks/use-in-view"

const posts = [
  {
    slug: "linux-kernel-memory-management",
    title: "深入 Linux 内核内存管理机制",
    excerpt: "探索虚拟内存子系统、页表结构与 Linux 内核中的内存分配策略。",
    date: "2026-01-15",
    readTime: "12 分钟",
    views: "2.4k",
    likes: 128,
    tags: ["Linux", "内核", "内存"],
    featured: true,
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
    featured: false,
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
    featured: false,
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
    featured: false,
  },
]

export function FeaturedPosts() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { threshold: 0.1 })

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
          <Link href={`/blog/${posts[0].slug}`} className="group lg:row-span-2">
            <article className="relative h-full rounded-xl border border-border/50 bg-card/40 p-8 transition-all duration-500 hover:border-primary/30 hover:bg-card/60 card-glow flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/[0.03] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/[0.06] transition-all duration-700" />
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-5">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
                    精选
                  </Badge>
                  <span className="text-xs text-muted-foreground/60 font-mono">{posts[0].date}</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300 leading-tight mb-4">
                  {posts[0].title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {posts[0].excerpt}
                </p>
              </div>
              <div className="relative mt-8 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Clock className="h-3.5 w-3.5" />
                  {posts[0].readTime}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Eye className="h-3.5 w-3.5" />
                  {posts[0].views}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Heart className="h-3.5 w-3.5" />
                  {posts[0].likes}
                </div>
                <div className="flex gap-2 ml-auto">
                  {posts[0].tags.map((tag) => (
                    <span key={tag} className="text-xs font-mono text-primary/50">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </Link>

          {posts.slice(1).map((post, index) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
              <article
                className="rounded-xl border border-border/50 bg-card/40 p-6 transition-all duration-500 hover:border-primary/30 hover:bg-card/60 h-full flex flex-col justify-between"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-muted-foreground/60 font-mono">{post.date}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 leading-snug mb-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                    <Clock className="h-3 w-3" />
                    {post.readTime}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                    <Eye className="h-3 w-3" />
                    {post.views}
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
