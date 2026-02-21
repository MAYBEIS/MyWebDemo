import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-service'
import {
  getWechatPayConfig,
  unifiedOrder,
  orderQuery,
  yuanToFen,
  generateExpireTime,
  verifySign,
  xmlToObject,
  generateSuccessResponse,
  generateFailResponse
} from '@/lib/wechat-pay'

/**
 * 创建微信支付订单
 * POST /api/shop/wechat-pay
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
        { success: false, error: '登录已过期' },
        { status: 401 }
      )
    }

    // 获取微信支付配置
    const config = getWechatPayConfig()
    if (!config) {
      return NextResponse.json(
        { success: false, error: '微信支付未配置' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { orderId, tradeType = 'NATIVE' } = body

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '订单ID不能为空' },
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

    // 检查订单状态
    if (order.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: '订单状态不允许支付' },
        { status: 400 }
      )
    }

    // 调用微信统一下单接口
    const result = await unifiedOrder(config, {
      body: order.products?.name || '商品购买',
      outTradeNo: order.orderNo,
      totalFee: yuanToFen(order.amount),
      spbillCreateIp: request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      '127.0.0.1',
      tradeType: tradeType,
      productId: order.productId,
      attach: order.id, // 附加订单ID用于回调
      timeExpire: generateExpireTime(30) // 30分钟后过期
    })

    if (result.returnCode !== 'SUCCESS') {
      console.error('微信统一下单失败:', result.returnMsg)
      return NextResponse.json(
        { success: false, error: result.returnMsg || '创建支付订单失败' },
        { status: 500 }
      )
    }

    if (result.resultCode !== 'SUCCESS') {
      console.error('微信统一下单业务失败:', result.errCodeDes)
      return NextResponse.json(
        { success: false, error: result.errCodeDes || '创建支付订单失败' },
        { status: 500 }
      )
    }

    // 更新订单的预支付ID
    await prisma.orders.update({
      where: { id: orderId },
      data: {
        paymentMethod: 'wechat',
        remark: `prepay_id: ${result.prepayId}`
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        prepayId: result.prepayId,
        codeUrl: result.codeUrl,     // Native支付的二维码链接
        mwebUrl: result.mwebUrl,     // H5支付跳转链接
        orderNo: order.orderNo
      }
    })
  } catch (error) {
    console.error('创建微信支付订单失败:', error)
    return NextResponse.json(
      { success: false, error: '创建支付订单失败' },
      { status: 500 }
    )
  }
}

/**
 * 查询微信支付订单状态
 * GET /api/shop/wechat-pay?orderNo=xxx
 */
export async function GET(request: NextRequest) {
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
        { success: false, error: '登录已过期' },
        { status: 401 }
      )
    }

    // 获取微信支付配置
    const config = getWechatPayConfig()
    if (!config) {
      return NextResponse.json(
        { success: false, error: '微信支付未配置' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orderNo = searchParams.get('orderNo')

    if (!orderNo) {
      return NextResponse.json(
        { success: false, error: '订单号不能为空' },
        { status: 400 }
      )
    }

    // 查询本地订单
    const order = await prisma.orders.findFirst({
      where: { orderNo }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      )
    }

    // 验证订单所属用户
    if (order.userId !== user.id && !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权查看此订单' },
        { status: 403 }
      )
    }

    // 如果订单已支付，直接返回
    if (order.status === 'paid' || order.status === 'completed') {
      return NextResponse.json({
        success: true,
        data: {
          tradeState: 'SUCCESS',
          orderStatus: order.status
        }
      })
    }

    // 查询微信订单状态
    const result = await orderQuery(config, orderNo)

    if (result.return_code !== 'SUCCESS') {
      return NextResponse.json(
        { success: false, error: result.return_msg || '查询订单失败' },
        { status: 500 }
      )
    }

    if (result.result_code !== 'SUCCESS') {
      return NextResponse.json(
        { success: false, error: result.err_code_des || '查询订单失败' },
        { status: 500 }
      )
    }

    const tradeState = result.trade_state

    // 如果支付成功，更新订单状态
    if (tradeState === 'SUCCESS') {
      await updateOrderPaid(order.id, result.transaction_id)
    }

    return NextResponse.json({
      success: true,
      data: {
        tradeState,
        tradeStateDesc: result.trade_state_desc,
        orderStatus: tradeState === 'SUCCESS' ? 'paid' : order.status
      }
    })
  } catch (error) {
    console.error('查询微信支付订单失败:', error)
    return NextResponse.json(
      { success: false, error: '查询订单失败' },
      { status: 500 }
    )
  }
}

/**
 * 更新订单为已支付状态
 */
async function updateOrderPaid(orderId: string, transactionId: string) {
  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    include: { products: true }
  })

  if (!order) return

  // 更新订单状态
  const updateData: any = {
    status: 'paid',
    paymentTime: new Date(),
    updatedAt: new Date(),
    remark: `微信支付交易号: ${transactionId}`
  }

  // 如果产品需要密钥，分配密钥
  if (order.products && order.products.stock !== -1) {
    const availableKey = await prisma.product_keys.findFirst({
      where: {
        productId: order.productId,
        status: 'available'
      }
    })

    if (availableKey) {
      await prisma.product_keys.update({
        where: { id: availableKey.id },
        data: {
          status: 'sold',
          orderId: order.id,
          userId: order.userId
        }
      })
      updateData.productKey = availableKey.key
    }
  }

  // 如果是会员产品，更新用户会员状态
  if (order.products && order.products.type === 'membership' && order.products.duration) {
    const existingMembership = await prisma.user_memberships.findUnique({
      where: { userId: order.userId }
    })

    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + order.products.duration)

    if (existingMembership) {
      const newEndDate = new Date(existingMembership.endDate)
      newEndDate.setDate(newEndDate.getDate() + order.products.duration)
      
      await prisma.user_memberships.update({
        where: { userId: order.userId },
        data: {
          endDate: newEndDate,
          active: true,
          updatedAt: new Date()
        }
      })
    } else {
      await prisma.user_memberships.create({
        data: {
          id: `membership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: order.userId,
          type: order.products.duration >= 365 ? 'yearly' : 'monthly',
          startDate,
          endDate
        }
      })
    }
  }

  await prisma.orders.update({
    where: { id: orderId },
    data: updateData
  })
}