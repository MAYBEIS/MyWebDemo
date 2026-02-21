import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-service'
import prisma from '@/lib/prisma'

// 默认设置
const DEFAULT_SETTINGS = {
  // 博客基本设置
  site_title: {
    value: 'SysLog',
    description: '网站标题',
  },
  site_description: {
    value: '一个现代化的技术博客',
    description: '网站描述',
  },
  site_keywords: {
    value: '博客,技术,编程',
    description: '网站关键字（用逗号分隔）',
  },
  site_logo: {
    value: '',
    description: '网站 Logo URL',
  },
  // 社交链接
  github_url: {
    value: '',
    description: 'GitHub 个人主页链接',
  },
  twitter_url: {
    value: '',
    description: 'Twitter/X 链接',
  },
  weibo_url: {
    value: '',
    description: '微博链接',
  },
  // 评论设置
  comment_max_depth: {
    value: '3',
    description: '评论最大回复深度 (1-5)',
  },
  comment_filter_words: {
    value: '',
    description: '敏感词过滤（用逗号分隔）',
  },
  comment_captcha_enabled: {
    value: 'false',
    description: '是否启用评论验证码',
  },
  image_host_provider: {
    value: 'local',
    description: '图床 provider (local/smms/imgbb/github)',
  },
  // 分页设置
  posts_per_page: {
    value: '10',
    description: '每页显示文章数量',
  },
  comments_per_page: {
    value: '20',
    description: '每页显示评论数量',
  },
  // 用户设置
  allow_registration: {
    value: 'true',
    description: '是否允许用户注册',
  },
  moderation_enabled: {
    value: 'false',
    description: '是否启用评论审核',
  },
}

/**
 * GET /api/admin/settings
 * 获取所有系统设置
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    // 检查是否是管理员
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      )
    }

    // 获取所有设置
    const settings = await prisma.system_settings.findMany()

    // 合并默认设置和数据库设置
    const mergedSettings: Record<string, { value: string; description: string }> = {}
    
    // 添加默认设置
    for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
      mergedSettings[key] = config
    }
    
    // 覆盖数据库中的设置
    for (const setting of settings) {
      mergedSettings[setting.key] = {
        value: setting.value,
        description: setting.description || '',
      }
    }

    return NextResponse.json({
      success: true,
      data: mergedSettings,
    })
  } catch (error) {
    console.error('获取设置失败:', error)
    return NextResponse.json(
      { success: false, error: '获取设置失败' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/settings
 * 更新系统设置
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    // 检查是否是管理员
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 验证设置值
    if (key === 'comment_max_depth') {
      const depth = parseInt(value, 10)
      if (isNaN(depth) || depth < 1 || depth > 5) {
        return NextResponse.json(
          { success: false, error: '评论深度必须是 1-5 之间的数字' },
          { status: 400 }
        )
      }
    }

    // 验证分页设置
    if (key === 'posts_per_page' || key === 'comments_per_page') {
      const num = parseInt(value, 10)
      if (isNaN(num) || num < 1 || num > 100) {
        return NextResponse.json(
          { success: false, error: `${key === 'posts_per_page' ? '每页文章' : '每页评论'}数量必须是 1-100 之间的数字` },
          { status: 400 }
        )
      }
    }

    // 更新或创建设置
    const setting = await prisma.system_settings.upsert({
      where: { key },
      update: {
        value: String(value),
        updatedAt: new Date(),
      },
      create: {
        id: `setting_${key}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        key,
        value: String(value),
        description: DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS]?.description || '',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        key: setting.key,
        value: setting.value,
      },
    })
  } catch (error) {
    console.error('更新设置失败:', error)
    // 返回更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : '更新设置失败'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
