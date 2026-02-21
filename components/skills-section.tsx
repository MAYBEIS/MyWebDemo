"use client"

import { useRef } from "react"
import { Cpu, Network, Code2, Database, Shield, Layers } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"

const skills = [
  {
    icon: Cpu,
    title: "系统编程",
    description: "内核模块、设备驱动、内存管理与底层硬件接口开发。",
    techs: ["C", "Rust", "Assembly"],
  },
  {
    icon: Network,
    title: "网络工程",
    description: "TCP/IP 协议栈实现、数据包处理、协议设计与 Socket 编程。",
    techs: ["DPDK", "eBPF", "Raw Sockets"],
  },
  {
    icon: Code2,
    title: "编译器设计",
    description: "词法/语法分析、AST 变换、代码生成与 LLVM 集成。",
    techs: ["LLVM", "Flex/Bison", "Cranelift"],
  },
  {
    icon: Database,
    title: "存储系统",
    description: "文件系统实现、B 树索引、预写式日志与数据持久化。",
    techs: ["ext4", "RocksDB", "io_uring"],
  },
  {
    icon: Shield,
    title: "安全研究",
    description: "二进制漏洞利用、逆向工程、模糊测试与安全分析。",
    techs: ["AFL++", "GDB", "IDA Pro"],
  },
  {
    icon: Layers,
    title: "虚拟化技术",
    description: "虚拟机管理程序开发、容器运行时、硬件辅助虚拟化。",
    techs: ["KVM", "QEMU", "OCI Runtime"],
  },
]

export function SkillsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { threshold: 0.1 })

  return (
    <section className="py-28 px-6 relative" ref={ref}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-[120px]" />
      </div>

      <div className={`mx-auto max-w-6xl relative transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-primary/70 mb-3 block tracking-wider uppercase">{"// 核心能力"}</span>
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">技术专长</h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto leading-relaxed">
            深耕系统级编程，专注于高性能、可靠性与正确性。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill, index) => (
            <div
              key={skill.title}
              className="group rounded-xl border border-border/50 bg-card/30 p-6 transition-all duration-500 hover:border-primary/25 hover:bg-card/60"
              style={{
                transitionDelay: isInView ? `${index * 80}ms` : "0ms",
                opacity: isInView ? 1 : 0,
                transform: isInView ? "translateY(0)" : "translateY(16px)",
              }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/8 border border-primary/15 mb-5 group-hover:bg-primary/15 group-hover:border-primary/30 transition-all duration-500">
                <skill.icon className="h-5 w-5 text-primary transition-transform duration-500 group-hover:scale-110" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2.5">{skill.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {skill.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {skill.techs.map((tech) => (
                  <span
                    key={tech}
                    className="text-xs font-mono px-2.5 py-1 rounded-md bg-primary/5 text-primary/70 border border-primary/10 transition-all duration-300 group-hover:border-primary/20 group-hover:text-primary/90"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
