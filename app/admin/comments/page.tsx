import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-service"
import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { AdminSidebar } from "@/components/admin-sidebar"
import { CommentsManager } from "@/components/comments-manager"
import prisma from "@/lib/prisma"

export const metadata = {
  title: "评论管理 | SysLog 管理后台",
  description: "管理文章评论",
}

async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  
  if (!token) {
    return null
  }
  
  return verifyToken(token)
}

export default async function AdminCommentsPage() {
  const user = await getCurrentUser()
  
  // 检查是否登录
  if (!user) {
    redirect("/login?redirect=/admin/comments")
  }
  
  // 检查是否是管理员（通过数据库中的 isAdmin 字段判断）
  if (!user.isAdmin) {
    redirect("/")
  }
  
  // 获取所有评论
  const comments = await prisma.comments.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: {
        select: { id: true, name: true, avatar: true, isAdmin: true }
      },
      posts: {
        select: { id: true, title: true, slug: true }
      },
      comments: {
        select: { id: true }
      }
    }
  })

  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="flex max-w-7xl mx-auto px-6 pt-20 pb-16">
        <AdminSidebar />
        <div className="flex-1 ml-8">
          <CommentsManager initialComments={JSON.parse(JSON.stringify(comments))} />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
