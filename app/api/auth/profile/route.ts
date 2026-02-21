import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-service'
import prisma from '@/lib/prisma'

/**
 * PUT /api/auth/profile
 * 更新用户资料
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, bio } = body

    // 验证必填字段
    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: '用户名不能为空' },
        { status: 400 }
      )
    }

    // 检查用户名是否已被其他用户使用
    if (name.trim() !== user.name) {
      const existingUser = await prisma.users.findFirst({
        where: {
          name: name.trim(),
          id: { not: user.id },
        },
      })

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: '用户名已被使用' },
          { status: 400 }
        )
      }
    }

    // 更新用户资料
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: {
        name: name.trim(),
        bio: bio?.trim() || '',
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        bio: updatedUser.bio,
        isAdmin: updatedUser.isAdmin,
      },
    })
  } catch (error) {
    console.error('更新用户资料失败:', error)
    return NextResponse.json(
      { success: false, error: '更新用户资料失败' },
      { status: 500 }
    )
  }
}
