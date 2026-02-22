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
      // 主页设置
      hero_badge_text: { value: '系统程序员 / Systems Programmer', description: '主页顶部角色标签文字' },
      hero_title_prefix: { value: '从零构建', description: '大标题开头文字（打字效果前）' },
      hero_title_suffix: { value: '深入底层的每一个字节', description: '大标题结尾文字（打字效果后）' },
      hero_typing_texts: { value: '内核模块,内存分配器,网络协议栈,文件系统,编译器,虚拟化引擎', description: '打字效果循环显示的文字（用逗号分隔）' },
      hero_description: { value: '专注于操作系统内核、编译器设计与高性能计算。在这里记录系统编程的思考与实践，探索内存管理、并发模型以及一切底层技术。', description: '主页描述文字' },
      // 终端窗口设置
      terminal_title: { value: 'zsh ~ /projects', description: '终端窗口标题栏文字' },
      terminal_command: { value: 'cat /proc/developer/skills', description: '终端显示的命令' },
      terminal_content: { value: 'lang:    C, Rust, Go, Python\nsystems: Linux, RTOS, Embedded\nfocus:   Kernel, Networking, Perf\neditor:  Neovim, VS Code', description: '终端输出内容（每行一项）' },
      // 博客基本设置
      site_title: { value: 'SysLog', description: '网站标题' },
      site_description: { value: '一个现代化的技术博客', description: '网站描述' },
      site_keywords: { value: '博客,技术,编程', description: '网站关键字（用逗号分隔）' },
      site_logo: { value: '', description: '网站 Logo URL' },
      // 社交链接
      github_url: { value: '', description: 'GitHub 个人主页链接' },
      twitter_url: { value: '', description: 'Twitter/X 链接' },
      weibo_url: { value: '', description: '微博链接' },
      // 评论设置
      comment_max_depth: { value: '3', description: '评论最大回复深度 (1-5)' },
      comment_filter_words: { value: '', description: '敏感词过滤（用逗号分隔）' },
      comment_captcha_enabled: { value: 'false', description: '是否启用评论验证码' },
      image_host_provider: { value: 'local', description: '图床类型 (local/smms/imgbb/github)' },
      // 分页设置
      posts_per_page: { value: '10', description: '每页显示文章数量' },
      comments_per_page: { value: '20', description: '每页显示评论数量' },
      // 用户设置
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
      // 主页设置
      hero_badge_text: { value: '系统程序员 / Systems Programmer', description: '主页顶部角色标签文字' },
      hero_title_prefix: { value: '从零构建', description: '大标题开头文字（打字效果前）' },
      hero_title_suffix: { value: '深入底层的每一个字节', description: '大标题结尾文字（打字效果后）' },
      hero_typing_texts: { value: '内核模块,内存分配器,网络协议栈,文件系统,编译器,虚拟化引擎', description: '打字效果循环显示的文字（用逗号分隔）' },
      hero_description: { value: '专注于操作系统内核、编译器设计与高性能计算。在这里记录系统编程的思考与实践，探索内存管理、并发模型以及一切底层技术。', description: '主页描述文字' },
      // 终端窗口设置
      terminal_title: { value: 'zsh ~ /projects', description: '终端窗口标题栏文字' },
      terminal_command: { value: 'cat /proc/developer/skills', description: '终端显示的命令' },
      terminal_content: { value: 'lang:    C, Rust, Go, Python\nsystems: Linux, RTOS, Embedded\nfocus:   Kernel, Networking, Perf\neditor:  Neovim, VS Code', description: '终端输出内容（每行一项）' },
      // 博客基本设置
      site_title: { value: 'SysLog', description: '网站标题' },
      site_description: { value: '一个现代化的技术博客', description: '网站描述' },
      site_keywords: { value: '博客,技术,编程', description: '网站关键字（用逗号分隔）' },
      site_logo: { value: '', description: '网站 Logo URL' },
      // 社交链接
      github_url: { value: '', description: 'GitHub 个人主页链接' },
      twitter_url: { value: '', description: 'Twitter/X 链接' },
      weibo_url: { value: '', description: '微博链接' },
      // 评论设置
      comment_max_depth: { value: '3', description: '评论最大回复深度 (1-5)' },
      comment_filter_words: { value: '', description: '敏感词过滤（用逗号分隔）' },
      comment_captcha_enabled: { value: 'false', description: '是否启用评论验证码' },
      image_host_provider: { value: 'local', description: '图床类型 (local/smms/imgbb/github)' },
      // 分页设置
      posts_per_page: { value: '10', description: '每页显示文章数量' },
      comments_per_page: { value: '20', description: '每页显示评论数量' },
      // 用户设置
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
