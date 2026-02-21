import { redirect } from "next/navigation"
import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { AdminSidebar } from "@/components/admin-sidebar"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-service"

export const metadata = {
  title: "管理后台 | SysLog",
  description: "系统管理后台",
}

async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  
  if (!token) {
    return null
  }
  
  return verifyToken(token)
}

export default async function AdminPage() {
  const user = await getCurrentUser()
  
  // 检查是否登录
  if (!user) {
    redirect("/login?redirect=/admin")
  }
  
  // 检查是否是管理员（通过数据库中的 isAdmin 字段判断）
  if (!user.isAdmin) {
    redirect("/")
  }
  
  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="flex max-w-7xl mx-auto px-6 pt-20 pb-16">
        <AdminSidebar />
        <div className="flex-1 ml-8">
          <div className="rounded-xl border border-border/40 bg-card/30 p-8">
            <h1 className="text-2xl font-bold text-foreground mb-6">管理后台</h1>
            <p className="text-muted-foreground/60">
              欢迎回来，{user.name}！这里是系统管理后台，你可以在这里管理文章、用户和评论。
            </p>
            
            {/* 快捷统计 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="rounded-lg border border-border/40 bg-card/50 p-4">
                <p className="text-sm text-muted-foreground/60">文章总数</p>
                <p className="text-2xl font-bold text-foreground mt-1">12</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-card/50 p-4">
                <p className="text-sm text-muted-foreground/60">用户总数</p>
                <p className="text-2xl font-bold text-foreground mt-1">156</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-card/50 p-4">
                <p className="text-sm text-muted-foreground/60">评论总数</p>
                <p className="text-2xl font-bold text-foreground mt-1">423</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
