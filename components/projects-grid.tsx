"use client"

import { useState } from "react"
import { Star, GitFork, ExternalLink, Github } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const projects = [
  {
    name: "microkernel",
    description: "用 Rust 编写的面向 x86_64 架构的最小微内核操作系统，具备基本的进程调度、内存管理和 IPC 机制。",
    lang: "Rust",
    stars: 342,
    forks: 28,
    tags: ["操作系统", "内核", "x86_64"],
    status: "活跃",
    url: "#",
    category: "操作系统",
  },
  {
    name: "pktforge",
    description: "基于 DPDK 的高性能用户态数据包处理框架，支持 10Gbps 线速数据包操控与深度包检测。",
    lang: "C",
    stars: 189,
    forks: 15,
    tags: ["网络", "DPDK", "高性能"],
    status: "活跃",
    url: "#",
    category: "网络",
  },
  {
    name: "tinyalloc",
    description: "自定义内存分配器，实现了 slab、buddy 和 arena 等多种分配策略，与 glibc malloc 进行了基准对比。",
    lang: "C",
    stars: 256,
    forks: 22,
    tags: ["内存", "分配器", "性能"],
    status: "稳定",
    url: "#",
    category: "内存",
  },
  {
    name: "riscv-emu",
    description: "周期精确的 RISC-V 模拟器，支持 RV64GC 指令集，具备 GDB 远程调试和硬件外设模拟功能。",
    lang: "Rust",
    stars: 412,
    forks: 35,
    tags: ["模拟器", "RISC-V", "架构"],
    status: "活跃",
    url: "#",
    category: "模拟",
  },
  {
    name: "minicc",
    description: "面向 x86_64 Linux 的小型 C 编译器，实现了 C11 标准的大部分特性，使用手写递归下降解析器。",
    lang: "C",
    stars: 178,
    forks: 12,
    tags: ["编译器", "C11", "x86_64"],
    status: "稳定",
    url: "#",
    category: "编译器",
  },
  {
    name: "kprobe-toolkit",
    description: "基于 eBPF 的内核追踪工具集，用于系统调用分析、网络流量监控和文件系统操作追踪。",
    lang: "C",
    stars: 95,
    forks: 8,
    tags: ["eBPF", "追踪", "Linux"],
    status: "活跃",
    url: "#",
    category: "可观测性",
  },
  {
    name: "rustfs",
    description: "用 Rust 编写的 FUSE 文件系统，支持日志、基于 extent 的分配和在线碎片整理。",
    lang: "Rust",
    stars: 203,
    forks: 18,
    tags: ["文件系统", "FUSE", "存储"],
    status: "测试中",
    url: "#",
    category: "存储",
  },
  {
    name: "netstack",
    description: "用户态 TCP/IP 网络协议栈实现，支持 TCP、UDP、ICMP 和 ARP 协议，基于 TUN/TAP 接口。",
    lang: "Rust",
    stars: 324,
    forks: 26,
    tags: ["TCP/IP", "网络", "用户态"],
    status: "活跃",
    url: "#",
    category: "网络",
  },
]

const langColors: Record<string, string> = {
  Rust: "bg-chart-1",
  C: "bg-chart-2",
  "C++": "bg-chart-3",
  Go: "bg-chart-4",
}

const statusStyles: Record<string, string> = {
  "活跃": "bg-primary/8 text-primary border-primary/15",
  "稳定": "bg-chart-2/8 text-chart-2 border-chart-2/15",
  "测试中": "bg-chart-4/8 text-chart-4 border-chart-4/15",
}

const categories = ["全部", ...Array.from(new Set(projects.map((p) => p.category)))]

export function ProjectsGrid() {
  const [activeCategory, setActiveCategory] = useState("全部")

  const filtered = activeCategory === "全部"
    ? projects
    : projects.filter((p) => p.category === activeCategory)

  return (
    <div>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((project) => (
          <a
            key={project.name}
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-border/40 bg-card/30 p-6 transition-all duration-500 hover:border-primary/25 hover:bg-card/60 flex flex-col"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Github className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors duration-300" />
                <span className="font-mono text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                  {project.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusStyles[project.status] || ""}`}>
                  {project.status}
                </Badge>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-primary/50 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>

            <p className="text-sm text-muted-foreground/60 leading-relaxed mb-5 flex-1">
              {project.description}
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${langColors[project.lang] || "bg-muted-foreground"}`} />
                <span className="text-xs font-mono text-muted-foreground/50">{project.lang}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
                <Star className="h-3.5 w-3.5" />
                {project.stars}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
                <GitFork className="h-3.5 w-3.5" />
                {project.forks}
              </div>
              <div className="flex gap-1.5 ml-auto">
                {project.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[10px] font-mono text-primary/40">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
