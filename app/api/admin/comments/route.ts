import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-service'
import prisma from '@/lib/prisma'

/**
 * GET /api/admin/comments
 * 获取所有评论列表（管理员专用）
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const postId = searchParams.get('postId')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (postId) {
      where.postId = postId
    }

    const total = await prisma.comments.count({ where })

    const comments = await prisma.comments.findMany({
      where,
      include: {
        users: {
          select: { id: true, name: true, avatar: true, isAdmin: true }
        },
        posts: {
          select: { id: true, title: true, slug: true }
        },
        other_comments: {
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      success: true,
      data: {
        comments: comments.map((comment) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          author: comment.users ? {
            id: comment.users.id,
            name: comment.users.name,
            avatar: comment.users.avatar,
            isAdmin: comment.users.isAdmin,
          } : null,
          post: comment.posts ? {
            id: comment.posts.id,
            title: comment.posts.title,
            slug: comment.posts.slug,
          } : null,
          parentId: comment.parentId,
          replyCount: comment.other_comments?.length || 0,
        })),
        total,
        page,
        limit,
      },
    })
  } catch (error) {
    console.error('获取评论列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取评论列表失败' },
      { status: 500 }
    )
  }
}
