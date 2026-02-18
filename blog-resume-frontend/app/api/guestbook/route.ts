import { NextRequest, NextResponse } from 'next/server'
import {
  getGuestbookEntries,
  createGuestbookEntry,
} from '@/lib/guestbook-service'
import { getCurrentUser } from '@/lib/auth-service'

/**
 * GET /api/guestbook
 * 获取留言列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const result = await getGuestbookEntries({ page, limit })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('获取留言列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取留言列表失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/guestbook
 * 创建新留言（需要登录）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录状态
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { message } = body

    // 验证必填字段
    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: '留言内容不能为空' },
        { status: 400 }
      )
    }

    // 验证留言长度
    if (message.length > 500) {
      return NextResponse.json(
        { success: false, error: '留言内容不能超过500字' },
        { status: 400 }
      )
    }

    const newEntry = await createGuestbookEntry({
      message: message.trim(),
      authorId: user.id,
    })

    return NextResponse.json(
      {
        success: true,
        data: newEntry,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('创建留言失败:', error)
    return NextResponse.json(
      { success: false, error: '创建留言失败' },
      { status: 500 }
    )
  }
}
