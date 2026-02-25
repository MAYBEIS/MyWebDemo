import { NextRequest, NextResponse } from 'next/server'
import { getPosts, createPost } from '@/lib/posts-service'
import { getCurrentUser } from '@/lib/auth-service'

/**
 * GET /api/posts
 * GET /api/posts?category=xxx&tag=xxx&search=xxx&page=1&limit=10&sortBy=createdAt
 * 1. category: string - Optional - Filter by category
 * 2. tag: string - Optional - Filter by tag
 * 3. search: string - Optional - Search in title, excerpt, content
 * 4. page: number - Optional - Page number (default: 1)
 * 5. limit: number - Optional - Items per page (default: 10)
 * 6. sortBy: string - Optional - Sort by field (createdAt, lastCommentAt, views)
 * Response: { success: boolean, data: { posts: Post[], total: number, page: number, limit: number } }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category') || undefined
    const tag = searchParams.get('tag') || undefined
    const search = searchParams.get('search') || undefined
    const sortBy = (searchParams.get('sortBy') as 'createdAt' | 'lastCommentAt' | 'views') || undefined

    const result = await getPosts({ page, limit, category, tag, search, sortBy })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('GET /api/posts error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get posts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/posts
 * Create a new post (requires authentication)
 * Request body: { title: string, content: string, excerpt?: string, category?: string, tags?: string[], coverImage?: string }
 * Response: { success: boolean, data: Post }
 */
export async function POST(request: NextRequest) {
  try {
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
    const { title, content, excerpt, category, tags, coverImage } = body

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const post = await createPost({
      title,
      content,
      excerpt,
      category,
      tags,
      coverImage,
      authorId: user.id,
    })

    return NextResponse.json(
      {
        success: true,
        data: post,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/posts error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
