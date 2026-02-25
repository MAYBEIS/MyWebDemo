import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-service'
import prisma from '@/lib/prisma'

/**
 * PATCH /api/admin/users/[id]
 * 更新用户信息（管理员专用）
 * 支持操作：设置管理员、封禁/解封用户
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    const { id } = await params

    // 检查是否是管理员（通过数据库中的 isAdmin 字段判断）
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { isAdmin, isBanned, bannedReason } = body

    // 构建更新数据
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    
    if (isAdmin !== undefined) {
      updateData.isAdmin = isAdmin
    }
    
    if (isBanned !== undefined) {
      updateData.isBanned = isBanned
      if (isBanned) {
        updateData.bannedAt = new Date()
        updateData.bannedReason = bannedReason || null
      } else {
        updateData.bannedAt = null
        updateData.bannedReason = null
      }
    }

    // 更新用户
    const updatedUser = await prisma.users.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        isBanned: true,
        bannedReason: true,
        bannedAt: true,
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
 * GET /api/admin/users/[id]
 * 获取用户详情（管理员专用）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    const { id } = await params

    // 检查是否是管理员
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      )
    }

    // 获取用户详情，包括统计信息
    const userDetails = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        isAdmin: true,
        isBanned: true,
        bannedReason: true,
        bannedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            posts: true,
            comments: true,
            orders: true,
            guestbooks: true,
          },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNo: true,
            amount: true,
            status: true,
            createdAt: true,
            products: {
              select: { name: true },
            },
          },
        },
        user_memberships: {
          select: {
            type: true,
            startDate: true,
            endDate: true,
            active: true,
          },
        },
      },
    })

    if (!userDetails) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: userDetails,
    })
  } catch (error) {
    console.error('获取用户详情失败:', error)
    return NextResponse.json(
      { success: false, error: '获取用户详情失败' },
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

    // 检查是否是管理员（通过数据库中的 isAdmin 字段判断）
    if (!user || !user.isAdmin) {
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
