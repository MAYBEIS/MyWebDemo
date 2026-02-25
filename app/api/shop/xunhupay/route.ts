import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-service'
import {
  getXunhuPayConfigFromDB,
  getXunhuPayConfig,
  createXunhuPayOrder,
  queryXunhuPayOrder,
  formatMoney
} from '@/lib/xunhupay'

/**
 * Create XunhuPay order
 * POST /api/shop/xunhupay
 * 
 * Request body:
 * {
 *   orderId: string,      // System order ID
 *   payType: 'wechat' | 'alipay'  // Payment method
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user login
    const token = request.cookies.get('auth_token')?.value || request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Please login first' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Login expired' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { orderId, payType = 'wechat' } = body

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Validate payment method
    if (!['wechat', 'alipay'].includes(payType)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported payment method' },
        { status: 400 }
      )
    }

    // Query order
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        products: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify order ownership
    if (order.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No permission to operate this order' },
        { status: 403 }
      )
    }

    // Check order status
    if (order.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Order status does not allow payment' },
        { status: 400 }
      )
    }

    // Get XunhuPay config from database or environment variables
    let config = await getXunhuPayConfigFromDB()
    if (!config) {
      config = getXunhuPayConfig()
    }
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'XunhuPay not configured, please configure payment channel in admin panel' },
        { status: 500 }
      )
    }

    // Build callback URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
    config.notifyUrl = `${siteUrl}/api/shop/xunhupay/notify`

    // Call XunhuPay create order
    const result = await createXunhuPayOrder(config, {
      trade_order_id: order.orderNo,
      total_fee: order.amount,
      title: order.products?.name || 'Product Purchase',
      type: 'NATIVE'  // QR code payment
    }, payType)

    if (result.err_code !== 0) {
      console.error('XunhuPay create order failed:', result.err_msg)
      return NextResponse.json(
        { success: false, error: result.err_msg || 'Failed to create payment order' },
        { status: 500 }
      )
    }

    // Update order payment method
    await prisma.orders.update({
      where: { id: orderId },
      data: {
        paymentMethod: `xunhupay_${payType}`,
        remark: `XunhuPay order ID: ${result.order_id || ''}`
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        payUrl: result.url,
        payQrcode: result.url_qrcode,
        orderId: result.order_id,
        orderNo: order.orderNo
      }
    })
  } catch (error) {
    console.error('Failed to create XunhuPay order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment order' },
      { status: 500 }
    )
  }
}

/**
 * Query XunhuPay order status
 * GET /api/shop/xunhupay?orderNo=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user login
    const token = request.cookies.get('auth_token')?.value || request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Please login first' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Login expired' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orderNo = searchParams.get('orderNo')

    if (!orderNo) {
      return NextResponse.json(
        { success: false, error: 'Order number is required' },
        { status: 400 }
      )
    }

    // Query local order
    const order = await prisma.orders.findFirst({
      where: { orderNo }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify order ownership
    if (order.userId !== user.id && !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'No permission to view this order' },
        { status: 403 }
      )
    }

    // If order is already paid, return directly
    if (order.status === 'paid' || order.status === 'completed') {
      return NextResponse.json({
        success: true,
        data: {
          tradeState: 'SUCCESS',
          orderStatus: order.status
        }
      })
    }

    // Query XunhuPay config
    let config = await getXunhuPayConfigFromDB()
    if (!config) {
      config = getXunhuPayConfig()
    }
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'XunhuPay not configured' },
        { status: 500 }
      )
    }

    // Query XunhuPay order status
    const result = await queryXunhuPayOrder(config, orderNo)

    if (result.err_code !== 0) {
      return NextResponse.json(
        { success: false, error: result.err_msg || 'Failed to query order' },
        { status: 500 }
      )
    }

    const tradeStatus = result.status

    // If payment successful, update order status
    if (tradeStatus === 'OD') {
      await updateOrderPaid(order.id, result.out_trade_order)
    }

    return NextResponse.json({
      success: true,
      data: {
        tradeState: tradeStatus === 'OD' ? 'SUCCESS' : 'NOTPAY',
        tradeStateDesc: tradeStatus === 'OD' ? 'Payment successful' : 'Waiting for payment',
        orderStatus: tradeStatus === 'OD' ? 'paid' : order.status
      }
    })
  } catch (error) {
    console.error('Failed to query XunhuPay order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to query order' },
      { status: 500 }
    )
  }
}

/**
 * Update order to paid status
 * Handle key allocation and membership benefits
 */
async function updateOrderPaid(orderId: string, transactionId: string) {
  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    include: { products: true }
  })

  if (!order) {
    console.error('[updateOrderPaid] Order not found:', orderId)
    return
  }

  console.log('[updateOrderPaid] Processing order:', orderId, 'Product type:', order.products?.type)

  // Use transaction to ensure data consistency
  await prisma.$transaction(async (tx) => {
    // Update order status
    const updateData: any = {
      status: 'paid',
      paymentTime: new Date(),
      updatedAt: new Date(),
      remark: `XunhuPay transaction ID: ${transactionId}`
    }

    // If product requires key (stock is not unlimited), allocate key
    if (order.products && order.products.stock !== -1 && order.products.type === 'serial_key') {
      console.log('[updateOrderPaid] Finding available key...')
      
      const availableKey = await tx.product_keys.findFirst({
        where: {
          productId: order.productId,
          status: 'available'
        }
      })

      if (availableKey) {
        console.log('[updateOrderPaid] Key found, allocating to user:', availableKey.key)
        
        // Update key status
        await tx.product_keys.update({
          where: { id: availableKey.id },
          data: {
            status: 'sold',
            orderId: order.id,
            userId: order.userId
          }
        })
        
        // Update order key field
        updateData.productKey = availableKey.key
      } else {
        console.warn('[updateOrderPaid] No available key found, product ID:', order.productId)
      }
    }

    // If membership product, update user membership status
    if (order.products && order.products.type === 'membership' && order.products.duration) {
      console.log('[updateOrderPaid] Processing membership benefit, duration:', order.products.duration, 'days')
      
      const existingMembership = await tx.user_memberships.findUnique({
        where: { userId: order.userId }
      })

      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + order.products.duration)

      if (existingMembership) {
        // If already a member, extend membership
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
        console.log('[updateOrderPaid] Membership extended to:', newEndDate)
      } else {
        // Create new membership
        await tx.user_memberships.create({
          data: {
            id: `membership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: order.userId,
            type: order.products.duration >= 365 ? 'yearly' : 'monthly',
            startDate,
            endDate
          }
        })
        console.log('[updateOrderPaid] New membership created, expiry:', endDate)
      }
    }

    // Update order
    await tx.orders.update({
      where: { id: orderId },
      data: updateData
    })
    
    console.log('[updateOrderPaid] Order update completed:', orderId)
  })
}
