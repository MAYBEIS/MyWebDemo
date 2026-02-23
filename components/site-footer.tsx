"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Terminal, Github, Twitter, Mail } from "lucide-react"

// 默认设置
const DEFAULT_SETTINGS = {
  site_title: 'SysLog',
  site_description: '探索系统编程的深度，一个字节一个字节地前行。',
  github_url: '',
  twitter_url: '',
  weibo_url: '',
  // 分区开关默认值
  section_blog_enabled: 'true',
  section_shop_enabled: 'true',
  section_trending_enabled: 'true',
  section_quiz_enabled: 'true',
  section_guestbook_enabled: 'true',
}

// 导航链接配置（包含设置键名）
const navLinksConfig = [
  { href: "/", label: "首页", settingKey: null },
  { href: "/blog", label: "博客", settingKey: "section_blog_enabled" },
  { href: "/projects", label: "项目", settingKey: null },
  { href: "/shop", label: "商店", settingKey: "section_shop_enabled" },
  { href: "/trending", label: "热榜", settingKey: "section_trending_enabled" },
  { href: "/quiz", label: "每日挑战", settingKey: "section_quiz_enabled" },
  { href: "/about", label: "关于", settingKey: null },
  { href: "/guestbook", label: "留言板", settingKey: "section_guestbook_enabled" },
]

export function SiteFooter() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false)

  // 获取网站设置
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

  // 根据设置过滤导航链接
  const navLinks = navLinksConfig.filter(link => {
    // 如果没有设置键名，则始终显示
    if (!link.settingKey) return true
    // 根据设置决定是否显示
    return (settings as Record<string, string>)[link.settingKey] !== 'false'
  })

  // 构建社交链接
  const socialLinks = []
  if (settings.github_url) {
    socialLinks.push({ icon: Github, href: settings.github_url, label: "GitHub" })
  }
  if (settings.twitter_url) {
    socialLinks.push({ icon: Twitter, href: settings.twitter_url, label: "Twitter" })
  }
  // 如果没有配置社交链接，显示默认的
  if (socialLinks.length === 0) {
    socialLinks.push(
      { icon: Github, href: "https://github.com", label: "GitHub" },
      { icon: Twitter, href: "https://twitter.com", label: "Twitter" }
    )
  }

  return (
    <footer className="border-t border-border/40 bg-card/20 relative">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 group mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/15 transition-all duration-300">
                <Terminal className="h-4 w-4 text-primary" />
              </div>
              {!isSettingsLoaded ? (
                <div className="h-6 w-20 bg-muted/30 rounded animate-pulse" />
              ) : (
                <span className="font-mono text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300">{settings.site_title}</span>
              )}
            </Link>
            {!isSettingsLoaded ? (
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted/30 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-muted/30 rounded animate-pulse" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                {settings.site_description}
              </p>
            )}
          </div>

          <div>
            <h4 className="text-xs font-mono font-semibold text-foreground/60 mb-5 uppercase tracking-wider">导航</h4>
            <div className="flex flex-col gap-2.5">
              {!isSettingsLoaded ? (
                // 加载状态骨架屏
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 w-16 bg-muted/30 rounded animate-pulse" />
                  ))}
                </>
              ) : (
                navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300 w-fit"
                  >
                    {link.label}
                  </Link>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono font-semibold text-foreground/60 mb-5 uppercase tracking-wider">主题</h4>
            <div className="flex flex-col gap-2.5">
              {["Linux 内核", "Rust 编程", "C/C++ 系统", "网络协议栈", "编译器设计"].map((topic) => (
                <span key={topic} className="text-sm text-muted-foreground/60">
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono font-semibold text-foreground/60 mb-5 uppercase tracking-wider">联系方式</h4>
            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/30 text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border/30 pt-7 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/40">
            {"基于 Next.js & Tailwind CSS 构建，部署于 Vercel。"}
          </p>
          <p className="text-xs text-muted-foreground/40 font-mono">
            {`// 2024-2026 ${settings.site_title}. 保留所有权利。`}
          </p>
        </div>
      </div>
    </footer>
  )
}
