import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

// 使用系统字体栈，避免网络依赖
// 生产环境可以切换回 Google Fonts

export const metadata: Metadata = {
  title: 'SysLog | 系统程序员 & 技术写作者',
  description: '个人博客与作品集，展示系统编程专长、深度技术文章和开源贡献。',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d1117',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'oklch(0.16 0.007 250)',
              border: '1px solid oklch(0.24 0.01 250)',
              color: 'oklch(0.93 0.005 250)',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
