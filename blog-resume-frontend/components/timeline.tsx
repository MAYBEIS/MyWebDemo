"use client"

import { useRef } from "react"
import { Briefcase, GraduationCap } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"

const experiences = [
  {
    type: "work" as const,
    title: "高级系统工程师",
    organization: "CloudScale Technologies",
    period: "2024 - 至今",
    description: "主导高性能分布式存储系统开发。设计并实现自定义内存分配器与无锁数据结构，实现亚微秒级延迟。",
    techs: ["Rust", "C", "io_uring", "RDMA"],
  },
  {
    type: "work" as const,
    title: "内核工程师",
    organization: "LinuxCore Labs",
    period: "2022 - 2024",
    description: "深度参与 Linux 内核网络子系统开发，专注于 XDP 和 eBPF 数据包处理。开发自定义网络协议的内核模块。",
    techs: ["C", "eBPF", "XDP", "Linux Kernel"],
  },
  {
    type: "work" as const,
    title: "系统程序员",
    organization: "EmbedTech Inc.",
    period: "2020 - 2022",
    description: "为基于 ARM 的嵌入式系统开发固件和设备驱动程序。为自定义 RTOS 实现实时调度器和内存管理单元。",
    techs: ["C", "ARM Assembly", "RTOS", "Embedded"],
  },
  {
    type: "education" as const,
    title: "计算机科学 硕士",
    organization: "清华大学",
    period: "2018 - 2020",
    description: "研究方向为操作系统与计算机体系结构。硕士论文：通过预测性预取提升缺页中断处理性能。",
    techs: ["操作系统", "体系结构", "性能优化"],
  },
  {
    type: "education" as const,
    title: "计算机科学 学士",
    organization: "北京大学",
    period: "2014 - 2018",
    description: "扎实的算法、数据结构与系统编程基础。系统编程社团和 CTF 安全竞赛队活跃成员。",
    techs: ["算法", "系统编程", "安全"],
  },
]

export function Timeline() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { threshold: 0.1 })

  return (
    <section ref={ref}>
      <h2 className="text-2xl font-bold text-foreground mb-10">工作经历 & 教育背景</h2>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border/30 md:left-[19px]" />

        <div className="flex flex-col gap-8">
          {experiences.map((exp, index) => (
            <div
              key={index}
              className="relative flex gap-6 pl-2 transition-all duration-600"
              style={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? "translateY(0) translateX(0)" : "translateY(16px) translateX(-8px)",
                transitionDelay: isInView ? `${index * 120}ms` : "0ms",
                transitionDuration: "0.6s",
                transitionTimingFunction: "ease-out",
              }}
            >
              {/* Icon */}
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-card/60">
                {exp.type === "work" ? (
                  <Briefcase className="h-4 w-4 text-primary" />
                ) : (
                  <GraduationCap className="h-4 w-4 text-chart-2" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 rounded-xl border border-border/40 bg-card/30 p-6 transition-all duration-300 hover:bg-card/50 hover:border-border/60">
                <div className="flex flex-col gap-1 mb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{exp.title}</h3>
                    <p className="text-sm text-primary/60">{exp.organization}</p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground/40 whitespace-nowrap">
                    {exp.period}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground/60 leading-relaxed mb-4">
                  {exp.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {exp.techs.map((tech) => (
                    <span
                      key={tech}
                      className="text-xs font-mono px-2.5 py-1 rounded-md bg-primary/5 text-primary/50 border border-primary/8"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
