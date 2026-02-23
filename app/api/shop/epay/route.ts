import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-service'
import {
  getEpayConfigFromDB,
  getEpayConfig,
  createEpayOrder,
  queryEpayOrder,
  formatMoney,
  verifyEpaySign
} from '@/lib/epay'

// 测试模式配置
const TEST_MODE = process.env.PAYMENT_TEST_MODE === 'true'
const TEST_AUTO_SUCCESS_MS = parseInt(process.env.PAYMENT_TEST_AUTO_SUCCESS_MS || '5000', 10)

// 存储测试模式下的支付状态（内存存储，重启后清空）
const testPaymentStatus = new Map<string, { paid: boolean; createdAt: number; type: string }>()

/**
 * 创建易支付订单
 * POST /api/shop/epay
 * 
 * 请求体：
 * {
 *   orderId: string,      // 系统订单ID
 *   payType: 'alipay' | 'wxpay'  // 支付方式
 * }
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

    const body = await request.json()
    const { orderId, payType = 'alipay' } = body

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '订单ID不能为空' },
        { status: 400 }
      )
    }

    // 验证支付方式
    if (!['alipay', 'wxpay', 'qqpay'].includes(payType)) {
      return NextResponse.json(
        { success: false, error: '不支持的支付方式' },
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

    // 测试模式：返回模拟的支付链接
    if (TEST_MODE) {
      console.log('[测试模式] 创建模拟易支付订单:', order.orderNo, '支付方式:', payType)
      
      // 记录测试支付状态
      testPaymentStatus.set(order.orderNo, {
        paid: false,
        createdAt: Date.now(),
        type: payType
      })
      
      // 更新订单的支付方式
      await prisma.orders.update({
        where: { id: orderId },
        data: {
          paymentMethod: `epay_${payType}`,
          remark: '测试模式支付'
        }
      })
      
      return NextResponse.json({
        success: true,
        data: {
          payUrl: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/orders?test_pay=success&orderNo=${order.orderNo}`,
          payQrcode: `test_qrcode_${payType}_${Date.now()}`,
          orderNo: order.orderNo,
          testMode: true,
          autoSuccessMs: TEST_AUTO_SUCCESS_MS
        }
      })
    }

    // 非测试模式：需要真实的易支付配置
    // 优先从数据库获取配置，其次从环境变量获取
    let config = await getEpayConfigFromDB()
    if (!config) {
      config = getEpayConfig()
    }
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: '易支付未配置，请在后台配置支付渠道' },
        { status: 500 }
      )
    }

    // 获取客户端IP
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1'

    // 构建回调URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
    const notifyUrl = `${siteUrl}/api/shop/epay/notify`
    const returnUrl = `${siteUrl}/orders?pay_result=success`

    // 调用易支付创建订单
    const result = await createEpayOrder(config, {
      type: payType,
      outTradeNo: order.orderNo,
      name: order.products?.name || '商品购买',
      money: formatMoney(order.amount),
      notifyUrl,
      returnUrl,
      clientIp,
      param: order.id  // 附加订单ID
    })

    if (result.code !== 1) {
      console.error('易支付创建订单失败:', result.msg)
      return NextResponse.json(
        { success: false, error: result.msg || '创建支付订单失败' },
        { status: 500 }
      )
    }

    // 更新订单的支付方式
    await prisma.orders.update({
      where: { id: orderId },
      data: {
        paymentMethod: `epay_${payType}`,
        remark: `易支付订单号: ${result.tradeNo || ''}`
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        payUrl: result.payUrl,
        payQrcode: result.payQrcode,
        tradeNo: result.tradeNo,
        orderNo: order.orderNo
      }
    })
  } catch (error) {
    console.error('创建易支付订单失败:', error)
    return NextResponse.json(
      { success: false, error: '创建支付订单失败' },
      { status: 500 }
    )
  }
}

/**
 * 查询易支付订单状态
 * GET /api/shop/epay?orderNo=xxx
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

    // 测试模式：模拟支付状态检查
    if (TEST_MODE) {
      const testStatus = testPaymentStatus.get(orderNo)
      
      // 如果没有测试状态记录，创建一个
      if (!testStatus) {
        testPaymentStatus.set(orderNo, {
          paid: false,
          createdAt: Date.now(),
          type: 'alipay'
        })
      }
      
      const status = testPaymentStatus.get(orderNo)!
      const elapsed = Date.now() - status.createdAt
      
      // 检查是否应该自动成功
      if (!status.paid && TEST_AUTO_SUCCESS_MS > 0 && elapsed >= TEST_AUTO_SUCCESS_MS) {
        status.paid = true
        console.log('[测试模式] 自动支付成功:', orderNo)
        
        // 更新订单状态
        await updateOrderPaid(order.id, `test_epay_${Date.now()}`)
        
        return NextResponse.json({
          success: true,
          data: {
            tradeState: 'SUCCESS',
            tradeStateDesc: '支付成功（测试模式）',
            orderStatus: 'paid',
            testMode: true
          }
        })
      }
      
      // 返回当前状态
      return NextResponse.json({
        success: true,
        data: {
          tradeState: status.paid ? 'SUCCESS' : 'NOTPAY',
          tradeStateDesc: status.paid ? '支付成功（测试模式）' : '等待支付（测试模式）',
          orderStatus: status.paid ? 'paid' : 'pending',
          testMode: true,
          remainingMs: TEST_AUTO_SUCCESS_MS > 0 ? Math.max(0, TEST_AUTO_SUCCESS_MS - elapsed) : null
        }
      })
    }

    // 非测试模式：查询易支付订单状态
    let config = await getEpayConfigFromDB()
    if (!config) {
      config = getEpayConfig()
    }
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: '易支付未配置' },
        { status: 500 }
      )
    }

    // 查询易支付订单状态
    const result = await queryEpayOrder(config, orderNo)

    if (result.code !== 1) {
      return NextResponse.json(
        { success: false, error: result.msg || '查询订单失败' },
        { status: 500 }
      )
    }

    const tradeStatus = result.trade_status

    // 如果支付成功，更新订单状态
    if (tradeStatus === 'TRADE_SUCCESS') {
      await updateOrderPaid(order.id, result.trade_no)
    }

    return NextResponse.json({
      success: true,
      data: {
        tradeState: tradeStatus === 'TRADE_SUCCESS' ? 'SUCCESS' : 'NOTPAY',
        tradeStateDesc: tradeStatus === 'TRADE_SUCCESS' ? '支付成功' : '等待支付',
        orderStatus: tradeStatus === 'TRADE_SUCCESS' ? 'paid' : order.status
      }
    })
  } catch (error) {
    console.error('查询易支付订单失败:', error)
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
      remark: `易支付交易号: ${transactionId}`
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
