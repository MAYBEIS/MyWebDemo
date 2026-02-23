import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 公开设置的键名列表（这些设置可以公开访问）
const PUBLIC_SETTINGS_KEYS = [
  // 主页设置
  'hero_badge_text',
  'hero_title_prefix',
  'hero_title_suffix',
  'hero_typing_texts',
  'hero_description',
  // 终端窗口设置
  'terminal_title',
  'terminal_command',
  'terminal_content',
  // 博客基本设置
  'site_title',
  'site_description',
  'site_keywords',
  'site_logo',
  // 社交链接
  'github_url',
  'twitter_url',
  'weibo_url',
  // 分区功能开关
  'section_blog_enabled',
  'section_shop_enabled',
  'section_trending_enabled',
  'section_quiz_enabled',
  'section_guestbook_enabled',
]

// 默认值
const DEFAULT_SETTINGS: Record<string, string> = {
  // 主页设置
  hero_badge_text: '系统程序员 / Systems Programmer',
  hero_title_prefix: '从零构建',
  hero_title_suffix: '深入底层的每一个字节',
  hero_typing_texts: '内核模块,内存分配器,网络协议栈,文件系统,编译器,虚拟化引擎',
  hero_description: '专注于操作系统内核、编译器设计与高性能计算。在这里记录系统编程的思考与实践，探索内存管理、并发模型以及一切底层技术。',
  // 终端窗口设置
  terminal_title: 'zsh ~ /projects',
  terminal_command: 'cat /proc/developer/skills',
  terminal_content: 'lang:    C, Rust, Go, Python\nsystems: Linux, RTOS, Embedded\nfocus:   Kernel, Networking, Perf\neditor:  Neovim, VS Code',
  // 博客基本设置
  site_title: 'SysLog',
  site_description: '一个现代化的技术博客',
  site_keywords: '博客,技术,编程',
  site_logo: '',
  // 社交链接
  github_url: '',
  twitter_url: '',
  weibo_url: '',
  // 分区功能开关（默认全部开启）
  section_blog_enabled: 'true',
  section_shop_enabled: 'true',
  section_trending_enabled: 'true',
  section_quiz_enabled: 'true',
  section_guestbook_enabled: 'true',
}

/**
 * 获取公开设置
 * GET /api/settings/public
 */
export async function GET() {
  try {
    const settings = await prisma.system_settings.findMany({
      where: {
        key: { in: PUBLIC_SETTINGS_KEYS }
      }
    })

    // 合并默认值和数据库值
    const result: Record<string, string> = { ...DEFAULT_SETTINGS }
    for (const setting of settings) {
      result[setting.key] = setting.value
    }

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取公开设置失败:', error)
    // 返回默认值
    return NextResponse.json({
      success: true,
      data: DEFAULT_SETTINGS
    })
  }
}
