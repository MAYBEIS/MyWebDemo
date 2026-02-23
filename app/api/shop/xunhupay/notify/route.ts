import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getXunhuPayConfigFromDB,
  getXunhuPayConfig,
  verifyHash,
  generateXunhuPaySuccessResponse,
  generateXunhuPayFailResponse,
  getPaymentTypeName
} from '@/lib/xunhupay'

/**
 * 虎皮椒支付异步通知回调
 * POST /api/shop/xunhupay/notify
 * 
 * 虎皮椒会在用户支付成功后调用此接口通知商户
 */
export async function POST(request: NextRequest) {
  try {
    // 获取通知数据
    const formData = await request.formData()
    const data: Record<string, string> = {}
    
    formData.forEach((value, key) => {
      data[key] = value.toString()
    })

    console.log('[虎皮椒回调] 收到通知:', JSON.stringify(data))

    // 解析回调数据
    const {
      appid,
      trade_order_id: tradeOrderId,
      out_trade_order: outTradeOrder,
      total_fee: totalFee,
      status,
      title,
      time,
      hash,
      nonce_str,
      type
    } = data

    // 验证必要参数
    if (!tradeOrderId || !status || !hash) {
      console.error('[虎皮椒回调] 参数不完整')
      return new NextResponse(generateXunhuPayFailResponse('参数不完整'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 查询本地订单
    const order = await prisma.orders.findFirst({
      where: { orderNo: tradeOrderId }
    })

    if (!order) {
      console.error('[虎皮椒回调] 订单不存在:', tradeOrderId)
      return new NextResponse(generateXunhuPayFailResponse('订单不存在'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 如果订单已支付，直接返回成功（防止重复通知）
    if (order.status === 'paid' || order.status === 'completed') {
      console.log('[虎皮椒回调] 订单已处理:', tradeOrderId)
      return new NextResponse(generateXunhuPaySuccessResponse(), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 获取虎皮椒配置验证签名
    let config = await getXunhuPayConfigFromDB()
    if (!config) {
      config = getXunhuPayConfig()
    }

    if (!config) {
      console.error('[虎皮椒回调] 未找到虎皮椒配置')
      return new NextResponse(generateXunhuPayFailResponse('配置错误'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 验证签名
    if (!verifyHash(data, config.appSecret)) {
      console.error('[虎皮椒回调] 签名验证失败')
      return new NextResponse(generateXunhuPayFailResponse('签名验证失败'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 验证支付状态 (OD表示支付成功)
    if (status !== 'OD') {
      console.log('[虎皮椒回调] 支付未成功:', status)
      return new NextResponse(generateXunhuPayFailResponse('支付未成功'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 验证金额（防止金额篡改）
    const orderAmount = order.amount.toFixed(2)
    if (totalFee !== orderAmount) {
      console.error('[虎皮椒回调] 金额不匹配:', totalFee, 'vs', orderAmount)
      return new NextResponse(generateXunhuPayFailResponse('金额不匹配'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 确定支付方式
    const payType = type === 'alipay' ? 'alipay' : 'wechat'

    // 更新订单状态
    await updateOrderPaid(order.id, outTradeOrder, payType)

    console.log('[虎皮椒回调] 订单支付成功:', tradeOrderId)

    // 返回成功响应
    return new NextResponse(generateXunhuPaySuccessResponse(), {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  } catch (error) {
    console.error('[虎皮椒回调] 处理失败:', error)
    return new NextResponse(generateXunhuPayFailResponse('处理失败'), {
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
      paymentMethod: `xunhupay_${payType}`,
      remark: `虎皮椒交易号: ${transactionId}, 支付方式: ${getPaymentTypeName(payType)}`
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
 * GET 请求处理（部分支付平台可能使用GET回调）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 将URL参数转换为数据对象
    const data: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      data[key] = value
    })

    console.log('[虎皮椒回调 GET] 收到通知:', JSON.stringify(data))

    const {
      trade_order_id: tradeOrderId,
      out_trade_order: outTradeOrder,
      total_fee: totalFee,
      status,
      hash,
      type
    } = data

    // 验证必要参数
    if (!tradeOrderId || !status || !hash) {
      return new NextResponse(generateXunhuPayFailResponse('参数不完整'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 查询本地订单
    const order = await prisma.orders.findFirst({
      where: { orderNo: tradeOrderId }
    })

    if (!order) {
      return new NextResponse(generateXunhuPayFailResponse('订单不存在'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 如果订单已支付，直接返回成功
    if (order.status === 'paid' || order.status === 'completed') {
      return new NextResponse(generateXunhuPaySuccessResponse(), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 获取配置验证签名
    let config = await getXunhuPayConfigFromDB()
    if (!config) {
      config = getXunhuPayConfig()
    }

    if (!config || !verifyHash(data, config.appSecret)) {
      return new NextResponse(generateXunhuPayFailResponse('签名验证失败'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 验证支付状态
    if (status !== 'OD') {
      return new NextResponse(generateXunhuPayFailResponse('支付未成功'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // 确定支付方式
    const payType = type === 'alipay' ? 'alipay' : 'wechat'

    // 更新订单状态
    await updateOrderPaid(order.id, outTradeOrder || '', payType)

    return new NextResponse(generateXunhuPaySuccessResponse(), {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  } catch (error) {
    console.error('[虎皮椒回调 GET] 处理失败:', error)
    return new NextResponse(generateXunhuPayFailResponse('处理失败'), {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
