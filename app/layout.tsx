import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'
import { prisma } from '@/lib/prisma'

// 使用系统字体栈，避免网络依赖
// 生产环境可以切换回 Google Fonts

// 动态生成 metadata
export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await prisma.system_settings.findMany({
      where: {
        key: { in: ['site_title', 'site_description', 'site_keywords'] }
      }
    })
    
    const settingsMap = new Map(settings.map(s => [s.key, s.value]))
    
    const title = settingsMap.get('site_title') || 'SysLog'
    const description = settingsMap.get('site_description') || '一个现代化的技术博客'
    const keywords = settingsMap.get('site_keywords') || '博客,技术,编程'
    
    return {
      title: `${title} | 系统程序员 & 技术写作者`,
      description,
      keywords,
    }
  } catch {
    return {
      title: 'SysLog | 系统程序员 & 技术写作者',
      description: '个人博客与作品集，展示系统编程专长、深度技术文章和开源贡献。',
    }
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              },
            }}
          />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
