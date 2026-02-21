"use client"

import { useRef } from "react"
import Link from "next/link"
import { ArrowRight, Star, GitFork, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useInView } from "@/hooks/use-in-view"

const projects = [
  {
    name: "microkernel",
    description: "用 Rust 编写的最小微内核操作系统，面向 x86_64 架构，具备基本的进程调度与内存管理功能。",
    lang: "Rust",
    stars: 342,
    forks: 28,
    tags: ["操作系统", "内核", "x86_64"],
    url: "#",
  },
  {
    name: "pktforge",
    description: "基于 DPDK 的高性能用户态数据包处理框架，支持 10Gbps 线速数据包操控。",
    lang: "C",
    stars: 189,
    forks: 15,
    tags: ["网络", "DPDK", "高性能"],
    url: "#",
  },
  {
    name: "tinyalloc",
    description: "自定义内存分配器，包含 slab、buddy 和 arena 等多种分配策略。",
    lang: "C",
    stars: 256,
    forks: 22,
    tags: ["内存", "分配器", "性能"],
    url: "#",
  },
  {
    name: "riscv-emu",
    description: "周期精确的 RISC-V 模拟器，支持 RV64GC 指令集与 GDB 远程调试。",
    lang: "Rust",
    stars: 412,
    forks: 35,
    tags: ["模拟器", "RISC-V", "架构"],
    url: "#",
  },
]

const langColors: Record<string, string> = {
  Rust: "bg-chart-1",
  C: "bg-chart-2",
  "C++": "bg-chart-3",
  Go: "bg-chart-4",
}

export function ProjectsPreview() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { threshold: 0.1 })

  return (
    <section className="py-28 px-6 relative" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/20 to-transparent pointer-events-none" />

      <div className={`mx-auto max-w-6xl relative transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="flex items-end justify-between mb-14">
          <div>
            <span className="text-xs font-mono text-primary/70 mb-3 block tracking-wider uppercase">{"// 开源项目"}</span>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">精选项目</h2>
          </div>
          <Link
            href="/projects"
            className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-300 group sm:flex"
          >
            查看全部项目
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((project, index) => (
            <Link
              key={project.name}
              href={project.url}
              className="group"
              style={{
                transitionDelay: isInView ? `${index * 100}ms` : "0ms",
                opacity: isInView ? 1 : 0,
                transform: isInView ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.6s ease-out",
              }}
            >
              <article className="rounded-xl border border-border/50 bg-card/30 p-6 transition-all duration-500 hover:border-primary/25 hover:bg-card/60 h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-3 w-3 rounded-full ${langColors[project.lang] || "bg-muted-foreground"}`} />
                    <span className="font-mono text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                      {project.name}
                    </span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                  {project.description}
                </p>

                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-muted-foreground/60">{project.lang}</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                    <Star className="h-3.5 w-3.5" />
                    {project.stars}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                    <GitFork className="h-3.5 w-3.5" />
                    {project.forks}
                  </div>
                  <div className="flex gap-1.5 ml-auto">
                    {project.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 bg-secondary/40 text-muted-foreground/70 border-border/50">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
          >
            查看全部项目
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
