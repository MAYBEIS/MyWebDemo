import { redirect } from "next/navigation"
import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { AdminSidebar } from "@/components/admin-sidebar"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-service"
import { DashboardContent } from "@/components/dashboard-content"

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

// 获取仪表盘统计数据
async function getDashboardStats() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value
    
    if (!token) {
      return null
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/dashboard/stats`, {
      headers: {
        Cookie: `auth_token=${token}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.success ? data.data : null
  } catch (error) {
    console.error('获取仪表盘数据失败:', error)
    return null
  }
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

  // 获取仪表盘数据
  const stats = await getDashboardStats()
  
  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="flex max-w-7xl mx-auto px-6 pt-20 pb-16">
        <AdminSidebar />
        <div className="flex-1 ml-8">
          <div className="rounded-xl border border-border/40 bg-card/30 p-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">管理后台</h1>
            <p className="text-muted-foreground/60 mb-6">
              欢迎回来，{user.name}！这里是系统管理后台，你可以在这里管理文章、用户和评论。
            </p>
            
            <DashboardContent initialData={stats} />
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
