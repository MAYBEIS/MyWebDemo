"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Users,
  MessageSquare,
  Settings,
  ShoppingCart,
  ChevronRight,
} from "lucide-react"

const menuItems = [
  {
    href: "/admin",
    label: "仪表盘",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/posts",
    label: "文章管理",
    icon: FileText,
  },
  {
    href: "/admin/users",
    label: "用户管理",
    icon: Users,
  },
  {
    href: "/admin/comments",
    label: "评论管理",
    icon: MessageSquare,
  },
  {
    href: "/admin/shop",
    label: "商店管理",
    icon: ShoppingCart,
  },
  {
    href: "/admin/settings",
    label: "系统设置",
    icon: Settings,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-24">
        <div className="rounded-xl border border-border/40 bg-card/30 p-4">
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/admin" && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground/60 hover:text-foreground hover:bg-card/50"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
        
        {/* 返回前台链接 */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2 mt-4 px-3 py-2.5 rounded-lg text-sm text-muted-foreground/60 hover:text-foreground hover:bg-card/30 transition-all duration-300"
        >
          返回前台
        </Link>
      </div>
    </aside>
  )
}
