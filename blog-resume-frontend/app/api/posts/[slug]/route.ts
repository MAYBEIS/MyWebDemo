import { NextRequest, NextResponse } from 'next/server'
import {
  getPostBySlug,
  updatePost,
  deletePost,
  incrementViews,
  incrementLikes,
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

    return NextResponse.json({
      success: true,
      data: post,
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
 * Partial update (e.g., like a post)
 * Request body: { action: 'like' }
 * Response: { success: boolean, data: { likes: number } }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { action } = body

    if (action === 'like') {
      await incrementLikes(slug)
      const post = await getPostBySlug(slug)

      return NextResponse.json({
        success: true,
        data: { likes: post?.likes || 0 },
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
