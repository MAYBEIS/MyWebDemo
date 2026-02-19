import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-service'
import prisma from '@/lib/prisma'

// 管理员邮箱列表
const ADMIN_EMAILS = ["admin@syslog.dev"]

/**
 * GET /api/admin/users
 * 获取所有用户列表（管理员专用）
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    // 检查是否是管理员
    if (!user || (!user.isAdmin && !ADMIN_EMAILS.includes(user.email))) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      )
    }

    const users = await prisma.users.findMany({
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json({
      success: true,
      data: users,
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    )
  }
}
