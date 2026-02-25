import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-service'
import { prisma } from '@/lib/prisma'

/**
 * 测试支付接口
 * POST /api/shop/test-pay
 * 
 * 用于开发测试的模拟支付接口，无需真实支付即可完成订单
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const token = request.cookies.get('auth_token')?.value || request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '登录已过期，请重新登录' },
        { status: 401 }
      )
    }

    // 检查测试支付渠道是否启用
    const testChannel = await prisma.payment_channels.findFirst({
      where: { code: 'test' }
    })

    if (!testChannel || !testChannel.enabled) {
      return NextResponse.json(
        { success: false, error: '测试支付渠道未启用' },
        { status: 400 }
      )
    }

    // 解析请求参数
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '缺少订单ID' },
        { status: 400 }
      )
    }

    // 查询订单
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        products: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      )
    }

    // 验证订单所属用户
    if (order.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: '无权操作此订单' },
        { status: 403 }
      )
    }

    // 验证订单状态
    if (order.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: '订单状态不正确，无法支付' },
        { status: 400 }
      )
    }

    // 获取配置
    const config = typeof testChannel.config === 'string' 
      ? JSON.parse(testChannel.config) 
      : testChannel.config
    
    const delay = parseInt(config?.delay || '1000')
    const autoSuccess = config?.autoSuccess !== 'false' // 默认自动成功

    // 模拟支付延迟
    await new Promise(resolve => setTimeout(resolve, Math.min(delay, 5000)))

    if (!autoSuccess) {
      return NextResponse.json(
        { success: false, error: '测试支付失败（配置为不自动成功）' },
        { status: 400 }
      )
    }

    // 更新订单状态为已支付
    const updatedOrder = await prisma.orders.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        paymentMethod: 'test',
        paymentTime: new Date(),
        remark: '测试支付模拟支付成功'
      }
    })

    // 如果是序列号产品，分配密钥
    if (order.products?.type === 'serial_key') {
      // 查找可用的密钥
      const availableKey = await prisma.product_keys.findFirst({
        where: {
          productId: order.productId,
          status: 'available'
        }
      })

      if (availableKey) {
        // 更新密钥状态
        await prisma.product_keys.update({
          where: { id: availableKey.id },
          data: {
            status: 'sold',
            soldAt: new Date(),
            orderId: order.id
          }
        })

        // 更新订单关联的密钥
        await prisma.orders.update({
          where: { id: orderId },
          data: {
            productKey: availableKey.key
          }
        })
      }
    }

    // 如果是会员产品，更新用户会员状态
    if (order.products?.type === 'membership' && order.products.duration) {
      const currentUser = await prisma.users.findUnique({
        where: { id: user.id }
      })

      if (currentUser) {
        // 计算会员到期时间
        const now = new Date()
        const currentExpiry = currentUser.memberExpiry ? new Date(currentUser.memberExpiry) : now
        const baseDate = currentExpiry > now ? currentExpiry : now
        const memberExpiry = new Date(baseDate.getTime() + order.products.duration * 24 * 60 * 60 * 1000)

        // 更新用户会员状态
        await prisma.users.update({
          where: { id: user.id },
          data: {
            isMember: true,
            memberExpiry: memberExpiry,
            memberType: 'premium'
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: updatedOrder.id,
        orderNo: updatedOrder.orderNo,
        status: updatedOrder.status,
        message: '测试支付成功'
      }
    })
  } catch (error) {
    console.error('测试支付失败:', error)
    return NextResponse.json(
      { success: false, error: '测试支付失败' },
      { status: 500 }
    )
  }
}
