import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-service'
import prisma from '@/lib/prisma'

// 默认设置
const DEFAULT_SETTINGS = {
  comment_max_depth: {
    value: '3',
    description: '评论最大回复深度 (1-5)',
  },
  image_host_provider: {
    value: 'local',
    description: '图床 provider (local/smms/imgbb/github)',
  },
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

    // 更新或创建设置
    const setting = await prisma.system_settings.upsert({
      where: { key },
      update: {
        value: String(value),
        updatedAt: new Date(),
      },
      create: {
        id: `setting_${Date.now()}`,
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
    return NextResponse.json(
      { success: false, error: '更新设置失败' },
      { status: 500 }
    )
  }
}
