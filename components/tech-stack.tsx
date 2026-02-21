"use client"

import { useRef } from "react"
import { Separator } from "@/components/ui/separator"
import { useInView } from "@/hooks/use-in-view"

const techCategories = [
  {
    title: "编程语言",
    items: [
      { name: "C", level: 95 },
      { name: "Rust", level: 90 },
      { name: "Go", level: 75 },
      { name: "Python", level: 80 },
      { name: "x86 Assembly", level: 70 },
    ],
  },
  {
    title: "系统平台",
    items: [
      { name: "Linux 内核", level: 88 },
      { name: "网络编程", level: 85 },
      { name: "实时操作系统", level: 72 },
      { name: "嵌入式系统", level: 68 },
      { name: "虚拟化技术", level: 78 },
    ],
  },
  {
    title: "工具链",
    items: [
      { name: "GDB/LLDB", level: 90 },
      { name: "perf/ftrace", level: 85 },
      { name: "Docker/k8s", level: 75 },
      { name: "Git", level: 92 },
      { name: "Neovim", level: 88 },
    ],
  },
]

export function TechStack() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { threshold: 0.2 })

  return (
    <section className="mb-20" ref={ref}>
      <h2 className="text-2xl font-bold text-foreground mb-10">技术栈</h2>

      <div className={`grid grid-cols-1 gap-5 md:grid-cols-3 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        {techCategories.map((category, catIndex) => (
          <div
            key={category.title}
            className="rounded-xl border border-border/40 bg-card/30 p-6 transition-all duration-500 hover:bg-card/50"
            style={{ transitionDelay: isInView ? `${catIndex * 100}ms` : "0ms" }}
          >
            <h3 className="text-xs font-semibold text-foreground/50 font-mono mb-6 uppercase tracking-wider">
              {category.title}
            </h3>
            <div className="flex flex-col gap-5">
              {category.items.map((item, itemIndex) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground/70">{item.name}</span>
                    <span className="text-xs text-muted-foreground/40 font-mono">{item.level}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-secondary/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-1000 ease-out"
                      style={{
                        width: isInView ? `${item.level}%` : "0%",
                        transitionDelay: isInView ? `${catIndex * 100 + itemIndex * 60}ms` : "0ms",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Separator className="mt-20 bg-border/20" />
    </section>
  )
}
