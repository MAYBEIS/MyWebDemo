import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-service'
import prisma from '@/lib/prisma'

/**
 * DELETE /api/admin/comments/[id]
 * 删除评论（管理员专用）
 */
export async function DELETE(
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

    // 查找评论
    const comment = await prisma.comments.findUnique({
      where: { id }
    })

    if (!comment) {
      return NextResponse.json(
        { success: false, error: '评论不存在' },
        { status: 404 }
      )
    }

    // 删除评论（级联删除子评论）
    await prisma.comments.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '评论已删除',
    })
  } catch (error) {
    console.error('删除评论失败:', error)
    return NextResponse.json(
      { success: false, error: '删除评论失败' },
      { status: 500 }
    )
  }
}
