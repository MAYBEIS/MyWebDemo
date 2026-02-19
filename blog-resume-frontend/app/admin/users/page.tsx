import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-service"
import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { AdminSidebar } from "@/components/admin-sidebar"
import { UsersManager } from "@/components/users-manager"
import prisma from "@/lib/prisma"

export const metadata = {
  title: "用户管理 | SysLog 管理后台",
  description: "管理系统用户",
}

// 管理员邮箱列表
const ADMIN_EMAILS = ["admin@syslog.dev"]

async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  
  if (!token) {
    return null
  }
  
  return verifyToken(token)
}

export default async function AdminUsersPage() {
  const user = await getCurrentUser()
  
  // 检查是否登录
  if (!user) {
    redirect("/login?redirect=/admin/users")
  }
  
  // 检查是否是管理员
  if (!user.isAdmin && !ADMIN_EMAILS.includes(user.email)) {
    redirect("/")
  }
  
  // 获取所有用户
  const users = await prisma.users.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      bio: true,
      isAdmin: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          comments: true,
        }
      }
    }
  })

  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="flex max-w-7xl mx-auto px-6 pt-20 pb-16">
        <AdminSidebar />
        <div className="flex-1 ml-8">
          <UsersManager initialUsers={JSON.parse(JSON.stringify(users))} />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
