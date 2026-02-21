import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-service"
import { NavHeader } from "@/components/nav-header"
import { SiteFooter } from "@/components/site-footer"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SettingsManager } from "@/components/settings-manager"
import prisma from "@/lib/prisma"

export const metadata = {
  title: "系统设置 | SysLog 管理后台",
  description: "管理系统配置",
}

async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  
  if (!token) {
    return null
  }
  
  return verifyToken(token)
}

// 获取所有设置
async function getSettings() {
  try {
    const settings = await prisma.system_settings.findMany()
    
    // 默认设置
    const defaults: Record<string, { value: string; description: string }> = {
      comment_max_depth: { value: '3', description: '评论最大回复深度 (1-5)' },
      image_host_provider: { value: 'local', description: '图床类型 (local/smms/imgbb/github)' },
      allow_registration: { value: 'true', description: '是否允许用户注册' },
      moderation_enabled: { value: 'false', description: '是否启用评论审核' },
    }
    
    // 合并
    const merged = { ...defaults }
    for (const s of settings) {
      merged[s.key] = { value: s.value, description: s.description || '' }
    }
    
    return merged
  } catch {
    return {
      comment_max_depth: { value: '3', description: '评论最大回复深度 (1-5)' },
      image_host_provider: { value: 'local', description: '图床类型 (local/smms/imgbb/github)' },
      allow_registration: { value: 'true', description: '是否允许用户注册' },
      moderation_enabled: { value: 'false', description: '是否启用评论审核' },
    }
  }
}

export default async function AdminSettingsPage() {
  const user = await getCurrentUser()
  
  // 检查是否登录
  if (!user) {
    redirect("/login?redirect=/admin/settings")
  }
  
  // 检查是否是管理员
  if (!user.isAdmin) {
    redirect("/")
  }
  
  const settings = await getSettings()

  return (
    <main className="min-h-screen bg-background noise-bg">
      <NavHeader />
      <div className="flex max-w-7xl mx-auto px-6 pt-20 pb-16">
        <AdminSidebar />
        <div className="flex-1 ml-8">
          <SettingsManager initialSettings={settings} />
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
