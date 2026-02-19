import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-service'
import prisma from '@/lib/prisma'

// 管理员邮箱列表
const ADMIN_EMAILS = ["admin@syslog.dev"]

/**
 * PATCH /api/admin/users/[id]
 * 更新用户信息（管理员专用）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    const { id } = await params

    // 检查是否是管理员
    if (!user || (!user.isAdmin && !ADMIN_EMAILS.includes(user.email))) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { isAdmin } = body

    // 更新用户
    const updatedUser = await prisma.users.update({
      where: { id },
      data: { isAdmin, updatedAt: new Date() },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedUser,
    })
  } catch (error) {
    console.error('更新用户失败:', error)
    return NextResponse.json(
      { success: false, error: '更新用户失败' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id]
 * 删除用户（管理员专用）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    const { id } = await params

    // 检查是否是管理员
    if (!user || (!user.isAdmin && !ADMIN_EMAILS.includes(user.email))) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      )
    }

    // 检查要删除的用户是否是管理员
    const targetUser = await prisma.users.findUnique({
      where: { id },
      select: { isAdmin: true },
    })

    if (targetUser?.isAdmin) {
      return NextResponse.json(
        { success: false, error: '无法删除管理员用户' },
        { status: 400 }
      )
    }

    // 删除用户
    await prisma.users.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '用户已删除',
    })
  } catch (error) {
    console.error('删除用户失败:', error)
    return NextResponse.json(
      { success: false, error: '删除用户失败' },
      { status: 500 }
    )
  }
}
