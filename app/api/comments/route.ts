import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-service'
import prisma from '@/lib/prisma'

/**
 * GET /api/comments
 * 获取评论列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (postId) {
      where.postId = postId
      where.parentId = null // 只获取顶级评论
    }

    const comments = await prisma.comments.findMany({
      where,
      include: {
        users: {
          select: { id: true, name: true, avatar: true, isAdmin: true }
        },
        other_comments: {
          include: {
            users: {
              select: { id: true, name: true, avatar: true, isAdmin: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.comments.count({ where })

    return NextResponse.json({
      success: true,
      data: comments.map((c: typeof comments[0]) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        author: {
          id: c.users.id,
          name: c.users.name,
          avatar: c.users.avatar,
          isAdmin: c.users.isAdmin,
        },
        replies: c.other_comments.map((r: typeof c.other_comments[0]) => ({
          id: r.id,
          content: r.content,
          createdAt: r.createdAt,
          author: {
            id: r.users.id,
            name: r.users.name,
            avatar: r.users.avatar,
            isAdmin: r.users.isAdmin,
          },
        })),
      })),
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('获取评论失败:', error)
    return NextResponse.json(
      { success: false, error: '获取评论失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/comments
 * 创建新评论
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { postId, content, parentId } = body

    if (!postId || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 验证文章是否存在
    const post = await prisma.posts.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return NextResponse.json(
        { success: false, error: '文章不存在' },
        { status: 404 }
      )
    }

    // 如果是回复，验证父评论是否存在
    if (parentId) {
      const parentComment = await prisma.comments.findUnique({
        where: { id: parentId }
      })
      if (!parentComment) {
        return NextResponse.json(
          { success: false, error: '父评论不存在' },
          { status: 404 }
        )
      }
    }

    const comment = await prisma.comments.create({
      data: {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: content.trim(),
        postId,
        authorId: user.id,
        parentId: parentId || null,
        updatedAt: new Date(),
      },
      include: {
        users: {
          select: { id: true, name: true, avatar: true, isAdmin: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: {
          id: comment.users.id,
          name: comment.users.name,
          avatar: comment.users.avatar,
          isAdmin: comment.users.isAdmin,
        },
      },
    })
  } catch (error) {
    console.error('创建评论失败:', error)
    return NextResponse.json(
      { success: false, error: '创建评论失败' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/comments
 * 删除评论
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('id')

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: '缺少评论 ID' },
        { status: 400 }
      )
    }

    // 查找评论
    const comment = await prisma.comments.findUnique({
      where: { id: commentId }
    })

    if (!comment) {
      return NextResponse.json(
        { success: false, error: '评论不存在' },
        { status: 404 }
      )
    }

    // 检查权限：管理员或评论作者可以删除
    if (!user.isAdmin && comment.authorId !== user.id) {
      return NextResponse.json(
        { success: false, error: '无权删除此评论' },
        { status: 403 }
      )
    }

    // 删除评论（级联删除子评论）
    await prisma.comments.delete({
      where: { id: commentId }
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

/**
 * PUT /api/comments
 * 修改评论
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
    const { id, content } = body

    if (!id || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
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

    // 检查权限：管理员或评论作者可以修改
    if (!user.isAdmin && comment.authorId !== user.id) {
      return NextResponse.json(
        { success: false, error: '无权修改此评论' },
        { status: 403 }
      )
    }

    // 更新评论
    const updatedComment = await prisma.comments.update({
      where: { id },
      data: {
        content: content.trim(),
        updatedAt: new Date(),
      },
      include: {
        users: {
          select: { id: true, name: true, avatar: true, isAdmin: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedComment.id,
        content: updatedComment.content,
        createdAt: updatedComment.createdAt,
        updatedAt: updatedComment.updatedAt,
        author: {
          id: updatedComment.users.id,
          name: updatedComment.users.name,
          avatar: updatedComment.users.avatar,
          isAdmin: updatedComment.users.isAdmin,
        },
      },
    })
  } catch (error) {
    console.error('修改评论失败:', error)
    return NextResponse.json(
      { success: false, error: '修改评论失败' },
      { status: 500 }
    )
  }
}
