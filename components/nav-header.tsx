"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Terminal, ChevronRight, User, LogOut, Settings, Shield, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth, logout } from "@/lib/auth-store"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/theme-toggle"

// 获取用户头像首字母
function getAvatarInitials(name: string, avatar: string | null): string {
  if (avatar) return avatar
  return name
    .split(/[_\s]/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/blog", label: "博客" },
  { href: "/projects", label: "项目" },
  { href: "/shop", label: "商店" },
  { href: "/trending", label: "热榜" },
  { href: "/quiz", label: "每日挑战" },
  { href: "/about", label: "关于" },
  { href: "/guestbook", label: "留言板" },
]

// 默认网站标题
const DEFAULT_SITE_TITLE = 'SysLog'

export function NavHeader() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [siteTitle, setSiteTitle] = useState(DEFAULT_SITE_TITLE)
  const pathname = usePathname()
  const { user, isLoggedIn } = useAuth()

  // 获取网站设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/public')
        const data = await response.json()
        if (data.success && data.data.site_title) {
          setSiteTitle(data.data.site_title)
        }
      } catch (error) {
        console.error('获取设置失败:', error)
      }
    }
    fetchSettings()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
    setShowUserMenu(false)
  }, [pathname])

  useEffect(() => {
    if (!showUserMenu) return
    const handleClick = () => setShowUserMenu(false)
    window.addEventListener("click", handleClick)
    return () => window.removeEventListener("click", handleClick)
  }, [showUserMenu])

  const handleLogout = () => {
    logout()
    toast.success("已退出登录")
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-background border-b border-border transition-shadow duration-300 ${
        isScrolled
          ? "shadow-lg shadow-background/20"
          : ""
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-300">
            <Terminal className="h-4 w-4 text-primary transition-transform duration-300 group-hover:scale-110" />
            <div className="absolute inset-0 rounded-lg bg-primary/5 animate-glow-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="font-mono text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
            {siteTitle}
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-2 text-sm transition-all duration-300 rounded-lg ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-primary line-glow" />
                )}
              </Link>
            )
          })}
        </div>

        {/* Desktop Auth / User */}
        <div className="hidden items-center gap-2.5 md:flex">
          {/* 主题切换 */}
          <ThemeToggle />
          
          {isLoggedIn && user ? (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu) }}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/40 transition-all duration-300"
              >
                <Avatar className="h-7 w-7 border border-border/40">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-mono font-bold">
                    {getAvatarInitials(user.name, user.avatar)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground/80 font-medium max-w-[100px] truncate">{user.name}</span>
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-slide-up"
                  style={{ animationDuration: "0.2s" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-3 border-b border-border/30">
                    <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground/50 truncate">{user.email}</p>
                  </div>
                  <div className="py-1.5">
                    {/* 管理员入口 */}
                    {user.isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-primary hover:bg-primary/5 transition-all duration-200"
                      >
                        <Shield className="h-4 w-4" /> 管理后台
                      </Link>
                    )}
                    <Link
                      href="/orders"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-secondary/30 transition-all duration-200"
                    >
                      <ShoppingCart className="h-4 w-4" /> 我的订单
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-secondary/30 transition-all duration-200"
                    >
                      <User className="h-4 w-4" /> 个人中心
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-secondary/30 transition-all duration-200"
                    >
                      <Settings className="h-4 w-4" /> 账号设置
                    </Link>
                  </div>
                  <div className="border-t border-border/30 py-1.5">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-all duration-200 w-full"
                    >
                      <LogOut className="h-4 w-4" /> 退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-300"
                >
                  登录
                </Button>
              </Link>
              <Link href="/login?tab=register">
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
                >
                  注册
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="relative md:hidden text-muted-foreground hover:text-foreground p-2 -mr-2 transition-colors duration-300"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="切换移动端菜单"
        >
          <span className={`block transition-all duration-300 ${isMobileMenuOpen ? "rotate-90 scale-110" : ""}`}>
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </span>
        </button>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${
          isMobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-border bg-background">
          <div className="flex flex-col px-6 py-4 gap-0.5">
            {isLoggedIn && user && (
              <div className="flex items-center gap-3 px-3 py-3 mb-2 border-b border-border/30 pb-4">
                <Avatar className="h-8 w-8 border border-border/40">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-mono">{getAvatarInitials(user.name, user.avatar)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground/40 truncate">{user.email}</p>
                </div>
              </div>
            )}
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-3 text-sm rounded-lg transition-all duration-300 ${
                    isActive
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                  }`}
                >
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary line-glow" />}
                  {link.label}
                </Link>
              )
            })}
            <div className="flex gap-2.5 pt-4 border-t border-border/50 mt-2">
              {isLoggedIn ? (
                <>
                  <Link href="/profile" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full border-border hover:border-primary/30">个人中心</Button>
                  </Link>
                  <Button size="sm" variant="outline" className="flex-1 border-border hover:border-destructive/30 hover:text-destructive" onClick={handleLogout}>
                    退出登录
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full border-border hover:border-primary/30">登录</Button>
                  </Link>
                  <Link href="/login?tab=register" className="flex-1">
                    <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">注册</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
