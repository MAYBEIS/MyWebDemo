import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-service'
import {
  getWechatPayConfig,
  getWechatPayConfigFromDB,
  unifiedOrder,
  orderQuery,
  yuanToFen,
  generateExpireTime,
  verifySign,
  xmlToObject,
  generateSuccessResponse,
  generateFailResponse
} from '@/lib/wechat-pay'

// 测试模式配置
const TEST_MODE = process.env.PAYMENT_TEST_MODE === 'true'
const TEST_AUTO_SUCCESS_MS = parseInt(process.env.PAYMENT_TEST_AUTO_SUCCESS_MS || '5000', 10)
const TEST_QR_CODE_URL = process.env.PAYMENT_TEST_QR_CODE_URL || 'weixin://wxpay/test_mode_simulated'

// 存储测试模式下的支付状态（内存存储，重启后清空）
const testPaymentStatus = new Map<string, { paid: boolean; createdAt: number }>()

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

    // 测试模式：返回模拟的支付二维码（无需真实配置）
    if (TEST_MODE) {
      console.log('[测试模式] 创建模拟支付订单:', order.orderNo)
      
      // 记录测试支付状态
      testPaymentStatus.set(order.orderNo, {
        paid: false,
        createdAt: Date.now()
      })
      
      // 更新订单的支付方式
      await prisma.orders.update({
        where: { id: orderId },
        data: {
          paymentMethod: 'wechat',
          remark: '测试模式支付'
        }
      })
      
      return NextResponse.json({
        success: true,
        data: {
          prepayId: `test_prepay_id_${Date.now()}`,
          codeUrl: TEST_QR_CODE_URL,
          orderNo: order.orderNo,
          testMode: true,
          autoSuccessMs: TEST_AUTO_SUCCESS_MS
        }
      })
    }

    // 非测试模式：需要真实的微信支付配置
    // 优先从数据库获取配置，其次从环境变量获取
    let config = await getWechatPayConfigFromDB()
    if (!config) {
      config = getWechatPayConfig()
    }
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: '微信支付未配置，请在后台配置支付渠道' },
        { status: 500 }
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

    // 测试模式：模拟支付状态检查（无需真实配置）
    if (TEST_MODE) {
      const testStatus = testPaymentStatus.get(orderNo)
      
      // 如果没有测试状态记录，创建一个
      if (!testStatus) {
        testPaymentStatus.set(orderNo, {
          paid: false,
          createdAt: Date.now()
        })
      }
      
      const status = testPaymentStatus.get(orderNo)!
      const elapsed = Date.now() - status.createdAt
      
      // 检查是否应该自动成功
      if (!status.paid && TEST_AUTO_SUCCESS_MS > 0 && elapsed >= TEST_AUTO_SUCCESS_MS) {
        status.paid = true
        console.log('[测试模式] 自动支付成功:', orderNo)
        
        // 更新订单状态
        await updateOrderPaid(order.id, `test_transaction_${Date.now()}`)
        
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

    // 非测试模式：需要真实的微信支付配置
    // 优先从数据库获取配置，其次从环境变量获取
    let config = await getWechatPayConfigFromDB()
    if (!config) {
      config = getWechatPayConfig()
    }
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: '微信支付未配置，请在后台配置支付渠道' },
        { status: 500 }
      )
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