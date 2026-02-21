import { NextResponse } from 'next/server'
import { getTags } from '@/lib/posts-service'

/**
 * GET /api/posts/tags
 * 获取所有文章标签
 * Response: { success: boolean, data: string[] }
 */
export async function GET() {
  try {
    const tags = await getTags()

    return NextResponse.json({
      success: true,
      data: tags,
    })
  } catch (error) {
    console.error('GET /api/posts/tags error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get tags' },
      { status: 500 }
    )
  }
}
