import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-service'

// 获取当前用户的会员信息
export async function GET(request: NextRequest) {
  try {
    // 尝试从多个 cookie 获取认证信息
    const token = request.cookies.get('auth_token')?.value || request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ success: false, error: '登录已过期' }, { status: 401 })
    }

    // 查询用户的会员信息
    const membership = await prisma.user_memberships.findUnique({
      where: {
        userId: user.id
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
