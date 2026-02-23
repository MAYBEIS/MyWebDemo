import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getEpayConfigFromDB,
  getEpayConfig,
  verifyEpaySign,
  generateEpaySuccessResponse,
  generateEpayFailResponse,
  getPaymentTypeName
} from '@/lib/epay'

/**
 * 易支付异步通知回调
 * POST /api/shop/epay/notify
 * 
 * 易支付会在用户支付成功后调用此接口通知商户
 */
export async function POST(request: NextRequest) {
  try {
    // 获取通知数据
    const formData = await request.formData()
    const data: Record<string, string> = {}
    
    formData.forEach((value, key) => {
      data[key] = value.toString()
    })

    console.log('[易支付回调] 收到通知:', JSON.stringify(data))

    // 解析回调数据
    const {
      trade_no: tradeNo,
      out_trade_no: outTradeNo,
      type: payType,
      name: productName,
      money,
      trade_status: tradeStatus,
      param,
      sign,
      sign_type: signType
    } = data

    // 验证必要参数
    if (!tradeNo || !outTradeNo || !tradeStatus || !sign) {
      console.error('[易支付回调] 参数不完整')
      return new NextResponse(generateEpayFailResponse('参数不完整'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 查询本地订单
    const order = await prisma.orders.findFirst({
      where: { orderNo: outTradeNo }
    })

    if (!order) {
      console.error('[易支付回调] 订单不存在:', outTradeNo)
      return new NextResponse(generateEpayFailResponse('订单不存在'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 如果订单已支付，直接返回成功（防止重复通知）
    if (order.status === 'paid' || order.status === 'completed') {
      console.log('[易支付回调] 订单已处理:', outTradeNo)
      return new NextResponse(generateEpaySuccessResponse(), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 获取易支付配置验证签名
    let config = await getEpayConfigFromDB()
    if (!config) {
      config = getEpayConfig()
    }

    if (!config) {
      console.error('[易支付回调] 未找到易支付配置')
      return new NextResponse(generateEpayFailResponse('配置错误'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 验证签名
    if (!verifyEpaySign(data, config.key)) {
      console.error('[易支付回调] 签名验证失败')
      return new NextResponse(generateEpayFailResponse('签名验证失败'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 验证支付状态
    if (tradeStatus !== 'TRADE_SUCCESS') {
      console.log('[易支付回调] 支付未成功:', tradeStatus)
      return new NextResponse(generateEpayFailResponse('支付未成功'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 验证金额（防止金额篡改）
    const orderAmount = order.amount.toFixed(2)
    if (money !== orderAmount) {
      console.error('[易支付回调] 金额不匹配:', money, 'vs', orderAmount)
      return new NextResponse(generateEpayFailResponse('金额不匹配'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 更新订单状态
    await updateOrderPaid(order.id, tradeNo, payType)

    console.log('[易支付回调] 订单支付成功:', outTradeNo)

    // 返回成功响应
    return new NextResponse(generateEpaySuccessResponse(), {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  } catch (error) {
    console.error('[易支付回调] 处理失败:', error)
    return new NextResponse(generateEpayFailResponse('处理失败'), {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

/**
 * 更新订单为已支付状态
 * 处理密钥分配和会员权益
 */
async function updateOrderPaid(orderId: string, transactionId: string, payType: string) {
  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    include: { products: true }
  })

  if (!order) {
    console.error('[updateOrderPaid] 订单不存在:', orderId)
    return
  }

  console.log('[updateOrderPaid] 开始处理订单:', orderId)

  // 使用事务确保数据一致性
  await prisma.$transaction(async (tx) => {
    // 更新订单状态
    const updateData: any = {
      status: 'paid',
      paymentTime: new Date(),
      updatedAt: new Date(),
      paymentMethod: `epay_${payType}`,
      remark: `易支付交易号: ${transactionId}, 支付方式: ${getPaymentTypeName(payType)}`
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

/**
 * GET 请求处理（部分易支付平台可能使用GET回调）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 将URL参数转换为数据对象
    const data: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      data[key] = value
    })

    console.log('[易支付回调 GET] 收到通知:', JSON.stringify(data))

    const {
      trade_no: tradeNo,
      out_trade_no: outTradeNo,
      type: payType,
      money,
      trade_status: tradeStatus,
      sign
    } = data

    // 验证必要参数
    if (!tradeNo || !outTradeNo || !tradeStatus || !sign) {
      return new NextResponse(generateEpayFailResponse('参数不完整'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 查询本地订单
    const order = await prisma.orders.findFirst({
      where: { orderNo: outTradeNo }
    })

    if (!order) {
      return new NextResponse(generateEpayFailResponse('订单不存在'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 如果订单已支付，直接返回成功
    if (order.status === 'paid' || order.status === 'completed') {
      return new NextResponse(generateEpaySuccessResponse(), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 获取配置验证签名
    let config = await getEpayConfigFromDB()
    if (!config) {
      config = getEpayConfig()
    }

    if (!config || !verifyEpaySign(data, config.key)) {
      return new NextResponse(generateEpayFailResponse('签名验证失败'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 验证支付状态
    if (tradeStatus !== 'TRADE_SUCCESS') {
      return new NextResponse(generateEpayFailResponse('支付未成功'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 更新订单状态
    await updateOrderPaid(order.id, tradeNo, payType || 'alipay')

    return new NextResponse(generateEpaySuccessResponse(), {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  } catch (error) {
    console.error('[易支付回调 GET] 处理失败:', error)
    return new NextResponse(generateEpayFailResponse('处理失败'), {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
