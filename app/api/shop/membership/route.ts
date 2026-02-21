import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取当前用户的会员信息
export async function GET(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    // 解析 cookie 获取用户 ID
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [key, ...v] = c.split('=')
        return [key, v.join('=')]
      })
    )

    let userId = null
    if (cookies.auth_token) {
      try {
        const decoded = Buffer.from(cookies.auth_token, 'base64').toString()
        const authData = JSON.parse(decoded)
        userId = authData.userId
      } catch {
        return NextResponse.json({ success: false, error: '无效的认证信息' }, { status: 401 })
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    // 查询用户的有效会员信息
    const membership = await prisma.user_memberships.findUnique({
      where: {
        userId
      }
    })

    // 检查会员是否有效
    if (membership && membership.active && new Date(membership.endDate) >= new Date()) {
      return NextResponse.json({
        success: true,
        data: {
          ...membership,
          status: 'active',
          products: {
            name: membership.type === 'monthly' ? '月度会员' : 
                  membership.type === 'yearly' ? '年度会员' : '终身会员'
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: null
    })
  } catch (error) {
    console.error('获取会员信息失败:', error)
    return NextResponse.json(
      { success: false, error: '获取会员信息失败' },
      { status: 500 }
    )
  }
}
