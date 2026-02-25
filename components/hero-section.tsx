"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowRight, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

// 设置类型定义
interface SiteSettings {
  hero_badge_text: string
  hero_title_prefix: string
  hero_title_suffix: string
  hero_typing_texts: string
  hero_description: string
  terminal_title: string
  terminal_command: string
  terminal_content: string
}

// 默认设置
const DEFAULT_SETTINGS: SiteSettings = {
  hero_badge_text: '系统程序员 / Systems Programmer',
  hero_title_prefix: '从零构建',
  hero_title_suffix: '深入底层的每一个字节',
  hero_typing_texts: '内核模块,内存分配器,网络协议栈,文件系统,编译器,虚拟化引擎',
  hero_description: '专注于操作系统内核、编译器设计与高性能计算。在这里记录系统编程的思考与实践，探索内存管理、并发模型以及一切底层技术。',
  terminal_title: 'zsh ~ /projects',
  terminal_command: 'cat /proc/developer/skills',
  terminal_content: 'lang:    C, Rust, Go, Python\nsystems: Linux, RTOS, Embedded\nfocus:   Kernel, Networking, Perf\neditor:  Neovim, VS Code',
}

// 骨架屏组件
function HeroSkeleton() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden noise-bg">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/[0.04] rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-[80px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center pt-16">
        {/* Badge skeleton */}
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-2 mb-10">
            <div className="h-2 w-2 rounded-full bg-muted/30 animate-pulse" />
            <div className="h-4 w-40 bg-muted/30 rounded animate-pulse" />
          </div>
        </div>

        {/* Title skeleton */}
        <div className="space-y-4 animate-slide-up-delay-1">
          <div className="flex items-center justify-center gap-2">
            <div className="h-12 w-24 bg-muted/30 rounded animate-pulse" />
            <div className="h-12 w-32 bg-muted/30 rounded animate-pulse" />
          </div>
          <div className="h-8 w-64 mx-auto bg-muted/30 rounded animate-pulse" />
        </div>

        {/* Description skeleton */}
        <div className="mt-7 max-w-2xl mx-auto space-y-2 animate-slide-up-delay-2">
          <div className="h-5 w-full bg-muted/30 rounded animate-pulse" />
          <div className="h-5 w-3/4 mx-auto bg-muted/30 rounded animate-pulse" />
        </div>

        {/* Buttons skeleton */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-slide-up-delay-2">
          <div className="h-12 w-32 bg-muted/30 rounded-lg animate-pulse" />
          <div className="h-12 w-32 bg-muted/30 rounded-lg animate-pulse" />
        </div>

        {/* Terminal skeleton */}
        <div className="mt-16 mx-auto max-w-xl">
          <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-secondary/20">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-muted/30 animate-pulse" />
                <div className="h-2.5 w-2.5 rounded-full bg-muted/30 animate-pulse" />
                <div className="h-2.5 w-2.5 rounded-full bg-muted/30 animate-pulse" />
              </div>
              <div className="ml-2 h-3 w-32 bg-muted/30 rounded animate-pulse" />
            </div>
            <div className="p-5 font-mono text-sm space-y-1.5">
              <div className="h-4 w-48 bg-muted/30 rounded animate-pulse" />
              <div className="h-4 w-56 bg-muted/30 rounded animate-pulse" />
              <div className="h-4 w-52 bg-muted/30 rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted/30 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/[0.04] rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-[80px] animate-float-delayed" />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(oklch(0.75 0.16 172 / 0.4) 1px, transparent 1px), linear-gradient(90deg, oklch(0.75 0.16 172 / 0.4) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
    </div>
  )
}

interface TerminalWindowProps {
  title: string
  command: string
  content: string
}

function TerminalWindow({ title, command, content }: TerminalWindowProps) {
  const [visibleLines, setVisibleLines] = useState(0)

  // 解析终端内容
  const contentLines = content.split('\n').filter(line => line.trim())
  const totalLines = contentLines.length + 2 // 命令行 + 内容行 + 光标行

  useEffect(() => {
    setVisibleLines(0)
    const timer = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= totalLines) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, 400)
    return () => clearInterval(timer)
  }, [totalLines])

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 glass overflow-hidden card-glow animate-slide-up-delay-3">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-secondary/20">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-chart-4/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-primary/70" />
        </div>
        <span className="ml-2 text-xs font-mono text-muted-foreground/70">{title}</span>
      </div>
      <div className="p-5 font-mono text-sm space-y-1.5">
        {/* 命令行 */}
        <div
          className={`flex items-center gap-2 transition-all duration-500 ${
            visibleLines > 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <span className="text-primary text-glow-sm">$</span>
          <span className="text-muted-foreground">{command}</span>
        </div>
        
        {/* 内容行 */}
        {contentLines.map((line, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 transition-all duration-500 ${
              i < visibleLines - 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <span className="text-foreground/70 pl-5">{line}</span>
          </div>
        ))}
        
        {/* 光标行 */}
        <div
          className={`flex items-center gap-2 transition-all duration-500 ${
            visibleLines >= totalLines ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <span className="text-primary text-glow-sm">$</span>
          <span className="typing-cursor text-primary" />
        </div>
      </div>
    </div>
  )
}

export function HeroSection() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false)
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  // 获取设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/public')
        const data = await response.json()
        if (data.success) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.data })
        }
      } catch (error) {
        console.error('获取设置失败:', error)
      } finally {
        setIsSettingsLoaded(true)
      }
    }
    fetchSettings()
  }, [])

  // 解析打字效果文字列表
  const typingTexts = settings.hero_typing_texts.split(',').map(t => t.trim()).filter(t => t)

  const animate = useCallback(() => {
    const currentFullText = typingTexts[currentTextIndex] || ''
    if (!isDeleting) {
      setDisplayText(currentFullText.slice(0, displayText.length + 1))
      if (displayText.length === currentFullText.length) {
        setTimeout(() => setIsDeleting(true), 2200)
      }
    } else {
      setDisplayText(currentFullText.slice(0, displayText.length - 1))
      if (displayText.length === 0) {
        setIsDeleting(false)
        setCurrentTextIndex((prev) => (prev + 1) % typingTexts.length)
      }
    }
  }, [displayText, isDeleting, currentTextIndex, typingTexts])

  useEffect(() => {
    const timeout = setTimeout(animate, isDeleting ? 40 : 90)
    return () => clearTimeout(timeout)
  }, [animate, isDeleting])

  // 如果设置未加载完成，显示骨架屏
  if (!isSettingsLoaded) {
    return <HeroSkeleton />
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden noise-bg">
      <GridBackground />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center pt-16">
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-2 mb-10 glass">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-mono text-primary tracking-wide">{settings.hero_badge_text}</span>
          </div>
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.08] animate-slide-up-delay-1">
          <span className="text-balance">{settings.hero_title_prefix} </span>
          <span className="text-primary text-glow inline-block min-w-[4ch]">{displayText}</span>
          <span className="typing-cursor" />
          <br />
          <span className="text-muted-foreground/80 text-balance">{settings.hero_title_suffix}</span>
        </h1>

        <p className="mt-7 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed animate-slide-up-delay-2">
          {settings.hero_description}
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-slide-up-delay-2">
          <Link href="/blog">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-7 h-12 text-sm font-medium transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-0.5"
            >
              阅读文章
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/projects">
            <Button
              variant="outline"
              size="lg"
              className="gap-2 border-border/60 hover:border-primary/40 hover:bg-primary/5 px-7 h-12 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5"
            >
              查看项目
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-16 mx-auto max-w-xl">
          <TerminalWindow 
            title={settings.terminal_title}
            command={settings.terminal_command}
            content={settings.terminal_content}
          />
        </div>

        <div className="mt-16 flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: "2s" }}>
          <span className="text-xs text-muted-foreground/40 font-mono">向下滚动</span>
          <div className="h-8 w-px bg-gradient-to-b from-muted-foreground/30 to-transparent" />
        </div>
      </div>
    </section>
  )
}
