import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
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

    const total = await prisma.guestbooks.count()

    const entries = await prisma.guestbooks.findMany({
      include: {
        users: {
          select: { id: true, name: true, avatar: true, isAdmin: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    // 转换为前端期望的格式
    const formattedEntries = entries.map((entry) => ({
      id: entry.id,
      message: entry.message,
      createdAt: entry.createdAt,
      author: {
        id: entry.users.id,
        name: entry.users.name,
        avatar: entry.users.avatar || '',
        isAdmin: entry.users.isAdmin,
      },
    }))

    return NextResponse.json({
      success: true,
      data: {
        entries: formattedEntries,
        total,
        page,
        limit,
      },
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

    const id = `guestbook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const newEntry = await prisma.guestbooks.create({
      data: {
        id,
        message: message.trim(),
        authorId: user.id,
        updatedAt: new Date(),
      },
      include: {
        users: {
          select: { id: true, name: true, avatar: true, isAdmin: true }
        }
      },
    })

    // 转换为前端期望的格式
    const formattedEntry = {
      id: newEntry.id,
      message: newEntry.message,
      createdAt: newEntry.createdAt,
      author: {
        id: newEntry.users.id,
        name: newEntry.users.name,
        avatar: newEntry.users.avatar || '',
        isAdmin: newEntry.users.isAdmin,
      },
    }

    return NextResponse.json(
      {
        success: true,
        data: formattedEntry,
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
