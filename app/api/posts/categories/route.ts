import { NextResponse } from 'next/server'
import { getCategories } from '@/lib/posts-service'

/**
 * GET /api/posts/categories
 * 获取所有文章分类
 * Response: { success: boolean, data: string[] }
 */
export async function GET() {
  try {
    const categories = await getCategories()

    return NextResponse.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    console.error('GET /api/posts/categories error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get categories' },
      { status: 500 }
    )
  }
}
