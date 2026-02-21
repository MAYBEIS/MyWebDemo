import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getWechatPayConfig,
  verifySign,
  xmlToObject,
  generateSuccessResponse,
  generateFailResponse
} from '@/lib/wechat-pay'

/**
 * 微信支付回调通知
 * POST /api/shop/wechat-pay/notify
 * 
 * 微信支付成功后会调用此接口通知商户
 */
export async function POST(request: NextRequest) {
  try {
    // 获取微信支付配置
    const config = getWechatPayConfig()
    if (!config) {
      console.error('微信支付配置不存在')
      return new NextResponse(generateFailResponse('配置错误'), {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      })
    }

    // 获取请求体
    const xmlData = await request.text()
    
    // 解析XML
    const notifyData = xmlToObject(xmlData)
    
    console.log('收到微信支付回调:', notifyData)

    // 验证返回状态
    if (notifyData.return_code !== 'SUCCESS') {
      console.error('微信支付回调返回失败:', notifyData.return_msg)
      return new NextResponse(generateFailResponse(notifyData.return_msg || '返回状态失败'), {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      })
    }

    // 验证签名
    if (!verifySign(notifyData, config.apiKey)) {
      console.error('微信支付回调签名验证失败')
      return new NextResponse(generateFailResponse('签名验证失败'), {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      })
    }

    // 验证业务结果
    if (notifyData.result_code !== 'SUCCESS') {
      console.error('微信支付业务失败:', notifyData.err_code_des)
      return new NextResponse(generateSuccessResponse(), {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      })
    }

    // 获取订单号和交易号
    const outTradeNo = notifyData.out_trade_no
    const transactionId = notifyData.transaction_id

    if (!outTradeNo) {
      console.error('微信支付回调缺少订单号')
      return new NextResponse(generateFailResponse('缺少订单号'), {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      })
    }

    // 查询本地订单
    const order = await prisma.orders.findFirst({
      where: { orderNo: outTradeNo },
      include: { products: true }
    })

    if (!order) {
      console.error('订单不存在:', outTradeNo)
      return new NextResponse(generateFailResponse('订单不存在'), {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      })
    }

    // 如果订单已支付，直接返回成功（防止重复通知）
    if (order.status === 'paid' || order.status === 'completed') {
      return new NextResponse(generateSuccessResponse(), {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      })
    }

    // 验证金额（防止金额篡改）
    const totalFee = parseInt(notifyData.total_fee)
    const expectedFee = Math.round(order.amount * 100) // 转换为分
    if (totalFee !== expectedFee) {
      console.error('金额不匹配:', { expected: expectedFee, actual: totalFee })
      return new NextResponse(generateFailResponse('金额不匹配'), {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      })
    }

    // 更新订单状态
    await updateOrderPaid(order, transactionId, notifyData)

    // 返回成功响应
    return new NextResponse(generateSuccessResponse(), {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    })
  } catch (error) {
    console.error('处理微信支付回调失败:', error)
    return new NextResponse(generateFailResponse('处理失败'), {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    })
  }
}

/**
 * 更新订单为已支付状态
 */
async function updateOrderPaid(
  order: any,
  transactionId: string,
  notifyData: Record<string, string>
) {
  // 更新订单状态
  const updateData: any = {
    status: 'paid',
    paymentTime: new Date(),
    updatedAt: new Date(),
    paymentMethod: 'wechat',
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
    where: { id: order.id },
    data: updateData
  })

  console.log('订单支付成功，已更新状态:', order.orderNo)
}