import { NextRequest, NextResponse } from 'next/server'
import {
  getPostBySlug,
  updatePost,
  deletePost,
  incrementViews,
  toggleLike,
  toggleBookmark,
  getPostInteractionStatus,
} from '@/lib/posts-service'
import { getCurrentUser } from '@/lib/auth-service'

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/posts/[slug]
 * Get a single post by slug
 * Response: { success: boolean, data: Post }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const post = await getPostBySlug(slug)

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    // Increment view count
    await incrementViews(slug)

    // 获取当前用户的互动状态
    const user = await getCurrentUser(request)
    let interactionStatus = { liked: false, bookmarked: false }
    
    if (user) {
      interactionStatus = await getPostInteractionStatus(slug, user.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        ...post,
        liked: interactionStatus.liked,
        bookmarked: interactionStatus.bookmarked,
      },
    })
  } catch (error) {
    console.error('GET /api/posts/[slug] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get post' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/posts/[slug]
 * Update a post (requires authentication)
 * Request body: { title?: string, content?: string, excerpt?: string, category?: string, tags?: string[], coverImage?: string, published?: boolean }
 * Response: { success: boolean, data: Post }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params

    // Verify user authentication
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!user.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const post = await updatePost(slug, body)

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('PUT /api/posts/[slug] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update post' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/posts/[slug]
 * Delete a post (requires authentication)
 * Response: { success: boolean, message: string }
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params

    // Verify user authentication
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!user.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const deleted = await deletePost(slug)

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    })
  } catch (error) {
    console.error('DELETE /api/posts/[slug] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/posts/[slug]
 * Partial update (like/bookmark actions)
 * Request body: { action: 'like' | 'bookmark' }
 * Response: { success: boolean, data: { liked: boolean, likes: number } } or { success: boolean, data: { bookmarked: boolean } }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    
    // 验证用户认证
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { action } = body

    if (action === 'like') {
      const result = await toggleLike(slug, user.id)
      return NextResponse.json({
        success: true,
        data: result,
      })
    }

    if (action === 'bookmark') {
      const result = await toggleBookmark(slug, user.id)
      return NextResponse.json({
        success: true,
        data: result,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('PATCH /api/posts/[slug] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update post' },
      { status: 500 }
    )
  }
}
