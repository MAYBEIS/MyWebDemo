import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-service'
import prisma from '@/lib/prisma'

/**
 * DELETE /api/guestbook/[id]
 * 删除留言（需要登录，管理员或留言作者可以删除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    const { id } = await params

    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    // 查找留言
    const entry = await prisma.guestbooks.findUnique({
      where: { id }
    })

    if (!entry) {
      return NextResponse.json(
        { success: false, error: '留言不存在' },
        { status: 404 }
      )
    }

    // 检查权限：管理员或留言作者可以删除
    if (!user.isAdmin && entry.authorId !== user.id) {
      return NextResponse.json(
        { success: false, error: '无权删除此留言' },
        { status: 403 }
      )
    }

    // 删除留言
    await prisma.guestbooks.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '留言已删除',
    })
  } catch (error) {
    console.error('删除留言失败:', error)
    return NextResponse.json(
      { success: false, error: '删除留言失败' },
      { status: 500 }
    )
  }
}
