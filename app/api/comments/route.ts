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

    // 获取当前用户（用于判断点赞状态）
    const currentUser = await getCurrentUser(request)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (postId) {
      where.postId = postId
      where.parentId = null // 只获取顶级评论
    }

    // 获取评论最大深度设置 (添加错误处理)
    let maxDepth = 3
    try {
      const maxDepthSetting = await (prisma as any).system_settings.findUnique({
        where: { key: 'comment_max_depth' }
      })
      if (maxDepthSetting && maxDepthSetting.value) {
        maxDepth = parseInt(maxDepthSetting.value, 10) || 3
      }
    } catch (e) {
      console.warn('获取评论深度设置失败，使用默认值:', e)
    }

    // 获取当前用户点赞的评论ID列表
    let userLikedCommentIds: string[] = []
    if (currentUser) {
      const userLikes = await prisma.comment_likes.findMany({
        where: { userId: currentUser.id },
        select: { commentId: true }
      })
      userLikedCommentIds = userLikes.map(like => like.commentId)
    }

    // 递归构建评论树
    const buildCommentTree = async (parentId: string | null, depth: number): Promise<any[]> => {
      if (depth > maxDepth) return []
      
      const comments = await prisma.comments.findMany({
        where: { parentId },
        include: {
          users: {
            select: { id: true, name: true, avatar: true, isAdmin: true }
          },
          comment_likes: {
            select: { userId: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      const result = []
      for (const comment of comments) {
        const replies = await buildCommentTree(comment.id, depth + 1)
        result.push({
          id: comment.id,
          content: comment.isRecalled ? '该评论已撤回' : comment.content,
          createdAt: comment.createdAt,
          likes: comment.likes,
          isRecalled: comment.isRecalled,
          isLiked: userLikedCommentIds.includes(comment.id),
          author: {
            id: comment.users.id,
            name: comment.users.name,
            avatar: comment.users.avatar,
            isAdmin: comment.users.isAdmin,
          },
          replies,
        })
      }
      return result
    }

    // 获取顶级评论
    const comments = await prisma.comments.findMany({
      where,
      include: {
        users: {
          select: { id: true, name: true, avatar: true, isAdmin: true }
        },
        comment_likes: {
          select: { userId: true }
        },
        other_comments: {
          include: {
            users: {
              select: { id: true, name: true, avatar: true, isAdmin: true }
            },
            comment_likes: {
              select: { userId: true }
            },
            other_comments: {
              include: {
                users: {
                  select: { id: true, name: true, avatar: true, isAdmin: true }
                },
                comment_likes: {
                  select: { userId: true }
                }
              },
              orderBy: { createdAt: 'asc' }
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

    // 简化检测：仅当 maxDepth < 3 时检查是否有隐藏评论
    const hasHiddenComments = maxDepth < 3

    // 格式化评论数据
    const formatComment = (c: any, depth: number = 0): any => {
      const isLiked = userLikedCommentIds.includes(c.id)
      return {
        id: c.id,
        content: c.isRecalled ? '该评论已撤回' : c.content,
        createdAt: c.createdAt,
        likes: c.likes,
        isRecalled: c.isRecalled,
        isLiked,
        author: {
          id: c.users.id,
          name: c.users.name,
          avatar: c.users.avatar,
          isAdmin: c.users.isAdmin,
        },
        replies: c.other_comments ? c.other_comments.map((r: any) => formatComment(r, depth + 1)) : [],
      }
    }

    return NextResponse.json({
      success: true,
      data: comments.map((c: any) => formatComment(c)),
      total,
      page,
      limit,
      maxDepth,
      hasHiddenComments,
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
        likes: 0,
        isRecalled: false,
        isLiked: false,
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
 * 删除评论（仅管理员可用）
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

    // 检查权限：只有管理员可以删除评论
    if (!user.isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权删除此评论，只有管理员可以删除评论' },
        { status: 403 }
      )
    }

    // 删除评论的点赞记录
    await prisma.comment_likes.deleteMany({
      where: { commentId }
    })

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
    const { id, content, action } = body

    // 点赞/取消点赞操作
    if (action === 'like' || action === 'unlike') {
      if (!id) {
        return NextResponse.json(
          { success: false, error: '缺少评论 ID' },
          { status: 400 }
        )
      }

      const comment = await prisma.comments.findUnique({
        where: { id }
      })

      if (!comment) {
        return NextResponse.json(
          { success: false, error: '评论不存在' },
          { status: 404 }
        )
      }

      if (action === 'like') {
        // 检查是否已点赞
        const existingLike = await prisma.comment_likes.findUnique({
          where: {
            commentId_userId: {
              commentId: id,
              userId: user.id
            }
          }
        })

        if (existingLike) {
          return NextResponse.json(
            { success: false, error: '已经点赞过了' },
            { status: 400 }
          )
        }

        // 添加点赞记录并增加点赞数
        await prisma.$transaction([
          prisma.comment_likes.create({
            data: {
              id: `clike_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              commentId: id,
              userId: user.id
            }
          }),
          prisma.comments.update({
            where: { id },
            data: { likes: { increment: 1 } }
          })
        ])

        return NextResponse.json({
          success: true,
          message: '点赞成功',
          data: { isLiked: true }
        })
      } else {
        // 取消点赞
        const existingLike = await prisma.comment_likes.findUnique({
          where: {
            commentId_userId: {
              commentId: id,
              userId: user.id
            }
          }
        })

        if (!existingLike) {
          return NextResponse.json(
            { success: false, error: '尚未点赞' },
            { status: 400 }
          )
        }

        // 删除点赞记录并减少点赞数
        await prisma.$transaction([
          prisma.comment_likes.delete({
            where: {
              commentId_userId: {
                commentId: id,
                userId: user.id
              }
            }
          }),
          prisma.comments.update({
            where: { id },
            data: { likes: { decrement: 1 } }
          })
        ])

        return NextResponse.json({
          success: true,
          message: '取消点赞成功',
          data: { isLiked: false }
        })
      }
    }

    // 撤回评论操作
    if (action === 'recall') {
      if (!id) {
        return NextResponse.json(
          { success: false, error: '缺少评论 ID' },
          { status: 400 }
        )
      }

      const comment = await prisma.comments.findUnique({
        where: { id }
      })

      if (!comment) {
        return NextResponse.json(
          { success: false, error: '评论不存在' },
          { status: 404 }
        )
      }

      // 只有评论作者可以撤回自己的评论
      if (comment.authorId !== user.id) {
        return NextResponse.json(
          { success: false, error: '只能撤回自己的评论' },
          { status: 403 }
        )
      }

      // 检查是否已经撤回
      if (comment.isRecalled) {
        return NextResponse.json(
          { success: false, error: '评论已撤回' },
          { status: 400 }
        )
      }

      // 撤回评论
      const updatedComment = await prisma.comments.update({
        where: { id },
        data: {
          isRecalled: true,
          recalledAt: new Date(),
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: '评论已撤回',
        data: {
          id: updatedComment.id,
          isRecalled: updatedComment.isRecalled
        }
      })
    }

    // 编辑评论内容
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

    // 检查权限：只有评论作者可以修改自己的评论
    if (comment.authorId !== user.id) {
      return NextResponse.json(
        { success: false, error: '只能修改自己的评论' },
        { status: 403 }
      )
    }

    // 检查是否已撤回
    if (comment.isRecalled) {
      return NextResponse.json(
        { success: false, error: '已撤回的评论无法编辑' },
        { status: 400 }
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
