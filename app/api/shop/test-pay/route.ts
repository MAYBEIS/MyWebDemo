import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-service'
import { prisma } from '@/lib/prisma'

// 存储测试模式下的支付状态（内存存储，重启后清空）
const testPaymentStatus = new Map<string, { 
  paid: boolean
  createdAt: number
  transactionId?: string
}>()

// 默认配置
const DEFAULT_DELAY = 3000 // 默认3秒后自动成功
const DEFAULT_AUTO_SUCCESS = true

/**
 * 测试支付接口 - 创建支付订单
 * POST /api/shop/test-pay
 * 
 * 用于开发测试的模拟支付接口，模拟微信/支付宝的支付流程
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
    
    const delay = parseInt(config?.delay || String(DEFAULT_DELAY))
    const autoSuccess = config?.autoSuccess !== 'false' && config?.autoSuccess !== false

    // 记录测试支付状态
    testPaymentStatus.set(order.orderNo, {
      paid: false,
      createdAt: Date.now()
    })

    // 更新订单的支付方式
    await prisma.orders.update({
      where: { id: orderId },
      data: {
        paymentMethod: 'test',
        remark: '测试模式支付'
      }
    })

    // 生成模拟的二维码URL（实际是一个模拟的支付页面URL）
    const testPayUrl = `test://pay?orderNo=${order.orderNo}&amount=${order.amount}&product=${encodeURIComponent(order.products?.name || '商品')}`

    console.log('[测试支付] 创建测试支付订单:', order.orderNo, '延迟:', delay, 'ms, 自动成功:', autoSuccess)

    return NextResponse.json({
      success: true,
      data: {
        prepayId: `test_prepay_id_${Date.now()}`,
        codeUrl: testPayUrl, // 模拟二维码内容
        orderNo: order.orderNo,
        testMode: true,
        autoSuccessMs: autoSuccess ? delay : 0,
        amount: order.amount,
        productName: order.products?.name
      }
    })
  } catch (error) {
    console.error('创建测试支付订单失败:', error)
    return NextResponse.json(
      { success: false, error: '创建支付订单失败' },
      { status: 500 }
    )
  }
}

/**
 * 查询测试支付订单状态
 * GET /api/shop/test-pay?orderNo=xxx
 * 
 * 模拟微信/支付宝的订单查询接口
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

    // 如果订单已支付，直接返回成功
    if (order.status === 'paid' || order.status === 'completed') {
      return NextResponse.json({
        success: true,
        data: {
          tradeState: 'SUCCESS',
          tradeStateDesc: '支付成功',
          orderStatus: order.status,
          testMode: true
        }
      })
    }

    // 检查测试支付渠道配置
    const testChannel = await prisma.payment_channels.findFirst({
      where: { code: 'test' }
    })

    const config = typeof testChannel?.config === 'string' 
      ? JSON.parse(testChannel.config) 
      : testChannel?.config
    
    const delay = parseInt(config?.delay || String(DEFAULT_DELAY))
    const autoSuccess = config?.autoSuccess !== 'false' && config?.autoSuccess !== false

    // 获取测试支付状态
    let testStatus = testPaymentStatus.get(orderNo)
    
    // 如果没有测试状态记录，创建一个
    if (!testStatus) {
      testStatus = {
        paid: false,
        createdAt: Date.now()
      }
      testPaymentStatus.set(orderNo, testStatus)
    }
    
    const elapsed = Date.now() - testStatus.createdAt
    
    // 检查是否应该自动成功
    if (!testStatus.paid && autoSuccess && delay > 0 && elapsed >= delay) {
      testStatus.paid = true
      testStatus.transactionId = `test_transaction_${Date.now()}`
      console.log('[测试支付] 自动支付成功:', orderNo)
      
      // 更新订单状态
      await updateOrderPaid(order.id, testStatus.transactionId)
      
      return NextResponse.json({
        success: true,
        data: {
          tradeState: 'SUCCESS',
          tradeStateDesc: '支付成功（测试模式）',
          orderStatus: 'paid',
          transactionId: testStatus.transactionId,
          testMode: true
        }
      })
    }
    
    // 返回当前状态
    return NextResponse.json({
      success: true,
      data: {
        tradeState: testStatus.paid ? 'SUCCESS' : 'NOTPAY',
        tradeStateDesc: testStatus.paid ? '支付成功（测试模式）' : '等待支付（测试模式）',
        orderStatus: testStatus.paid ? 'paid' : 'pending',
        testMode: true,
        remainingMs: autoSuccess && delay > 0 ? Math.max(0, delay - elapsed) : null
      }
    })
  } catch (error) {
    console.error('查询测试支付订单失败:', error)
    return NextResponse.json(
      { success: false, error: '查询订单失败' },
      { status: 500 }
    )
  }
}

/**
 * 更新订单为已支付状态
 * 处理密钥分配和会员权益
 */
async function updateOrderPaid(orderId: string, transactionId: string) {
  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    include: { products: true }
  })

  if (!order) {
    console.error('[updateOrderPaid] 订单不存在:', orderId)
    return
  }

  console.log('[updateOrderPaid] 开始处理订单:', orderId, '产品类型:', order.products?.type)

  // 使用事务确保数据一致性
  await prisma.$transaction(async (tx) => {
    // 更新订单状态
    const updateData: any = {
      status: 'paid',
      paymentTime: new Date(),
      updatedAt: new Date(),
      remark: `测试支付交易号: ${transactionId}`
    }

    // 如果产品需要密钥（库存不是无限），分配密钥
    if (order.products && order.products.stock !== -1 && order.products.type === 'serial_key') {
      console.log('[updateOrderPaid] 查找可用密钥...')
      
      const availableKey = await tx.product_keys.findFirst({
        where: {
          productId: order.productId,
          status: 'available'
        }
      })

      if (availableKey) {
        console.log('[updateOrderPaid] 找到密钥，分配给用户:', availableKey.key)
        
        // 更新密钥状态
        await tx.product_keys.update({
          where: { id: availableKey.id },
          data: {
            status: 'sold',
            orderId: order.id,
            userId: order.userId
          }
        })
        
        // 更新订单的密钥字段
        updateData.productKey = availableKey.key
      } else {
        console.warn('[updateOrderPaid] 没有找到可用密钥，产品ID:', order.productId)
      }
    }

    // 如果是会员产品，更新用户会员状态
    if (order.products && order.products.type === 'membership' && order.products.duration) {
      console.log('[updateOrderPaid] 处理会员权益，时长:', order.products.duration, '天')
      
      const existingMembership = await tx.user_memberships.findUnique({
        where: { userId: order.userId }
      })

      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + order.products.duration)

      if (existingMembership) {
        // 如果已有会员，延长会员时间
        const newEndDate = new Date(existingMembership.endDate)
        newEndDate.setDate(newEndDate.getDate() + order.products.duration)
        
        await tx.user_memberships.update({
          where: { userId: order.userId },
          data: {
            endDate: newEndDate,
            active: true,
            updatedAt: new Date()
          }
        })
        console.log('[updateOrderPaid] 会员已延长至:', newEndDate)
      } else {
        // 创建新会员
        await tx.user_memberships.create({
          data: {
            id: `membership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: order.userId,
            type: order.products.duration >= 365 ? 'yearly' : 'monthly',
            startDate,
            endDate
          }
        })
        console.log('[updateOrderPaid] 新会员已创建，到期时间:', endDate)
      }
    }

    // 更新订单
    await tx.orders.update({
      where: { id: orderId },
      data: updateData
    })
    
    console.log('[updateOrderPaid] 订单更新完成:', orderId)
  })
}
