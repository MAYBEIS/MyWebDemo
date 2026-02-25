import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/comments/recent
 * 获取最近的评论列表
 * Query params:
 * - limit: number - 返回评论数量 (默认: 5)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '5')

    // 获取最近的评论（不包括被撤回的评论）
    // 使用 any 类型绕过 Prisma 类型检查（因为 schema 更新后需要重新生成客户端）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comments = await (prisma as any).comments.findMany({
      where: {
        isRecalled: false, // 排除被撤回的评论
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            avatar: true,
          }
        },
        posts: {
          select: {
            id: true,
            title: true,
            slug: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
    })

    // 格式化返回数据
    const formattedComments = comments.map((comment: any) => ({
      id: comment.id,
      content: comment.content.length > 100 
        ? comment.content.substring(0, 100) + '...' 
        : comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: {
        id: comment.users.id,
        name: comment.users.name,
        image: comment.users.avatar,
      },
      post: {
        id: comment.posts.id,
        title: comment.posts.title,
        slug: comment.posts.slug,
      },
    }))

    return NextResponse.json({
      success: true,
      data: formattedComments,
    })
  } catch (error) {
    console.error('获取最近评论失败:', error)
    return NextResponse.json(
      { success: false, error: '获取最近评论失败' },
      { status: 500 }
    )
  }
}
