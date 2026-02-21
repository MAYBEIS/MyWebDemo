import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-service'

// 生成订单号
function generateOrderNo() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substr(2, 8).toUpperCase()
  return `ORD${year}${month}${day}${random}`
}

// 获取订单列表
export async function GET(request: NextRequest) {
  try {
    // 尝试从多个 cookie 获取认证信息
    const token = request.cookies.get('auth_token')?.value || request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: '未登录' },
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
    const status = searchParams.get('status')
    const isAdmin = searchParams.get('admin') === 'true'

    const where: any = {}
    
    // 非管理员只能查看自己的订单
    if (!user.isAdmin || !isAdmin) {
      where.userId = user.id
    }
    
    if (status) {
      where.status = status
    }

    const orders = await prisma.orders.findMany({
      where,
      include: {
        products: {
          select: {
            id: true,
            name: true,
            type: true,
            image: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        product_keys: {
          select: {
            key: true,
            status: true,
            expiresAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: orders
    })
  } catch (error) {
    console.error('获取订单列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取订单列表失败' },
      { status: 500 }
    )
  }
}

// 创建订单
export async function POST(request: NextRequest) {
  try {
    // 尝试从多个 cookie 获取认证信息
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
    const { productId, paymentMethod } = body

    if (!productId) {
      return NextResponse.json(
        { success: false, error: '请选择产品' },
        { status: 400 }
      )
    }

    // 获取产品信息
    const product = await prisma.products.findUnique({
      where: { id: productId }
    })

    if (!product || !product.status) {
      return NextResponse.json(
        { success: false, error: '产品不存在或已下架' },
        { status: 400 }
      )
    }

    // 检查库存
    if (product.stock !== -1) {
      const availableKeys = await prisma.product_keys.count({
        where: {
          productId,
          status: 'available'
        }
      })
      if (availableKeys === 0) {
        return NextResponse.json(
          { success: false, error: '产品已售罄' },
          { status: 400 }
        )
      }
    }

    // 检查待支付订单数量（最多3个）
    const pendingOrdersCount = await prisma.orders.count({
      where: {
        userId: user.id,
        status: 'pending'
      }
    })
    if (pendingOrdersCount >= 3) {
      return NextResponse.json(
        { success: false, error: '您有太多未支付的订单，请先完成支付或取消订单' },
        { status: 400 }
      )
    }

    // 创建订单
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const orderNo = generateOrderNo()

    const order = await prisma.orders.create({
      data: {
        id: orderId,
        orderNo,
        userId: user.id,
        productId,
        amount: product.price,
        status: 'pending',
        paymentMethod: paymentMethod || null
      }
    })

    return NextResponse.json({
      success: true,
      data: order,
      message: '订单创建成功，请完成支付'
    })
  } catch (error) {
    console.error('创建订单失败:', error)
    return NextResponse.json(
      { success: false, error: '创建订单失败' },
      { status: 500 }
    )
  }
}

// 更新订单状态（管理员或支付回调）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, orderId, status, transactionId } = body
    const targetOrderId = id || orderId

    if (!targetOrderId || !status) {
      return NextResponse.json(
        { success: false, error: '参数错误' },
        { status: 400 }
      )
    }

    const order = await prisma.orders.findUnique({
      where: { id: targetOrderId },
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

    // 更新订单状态
    const updateData: any = {
      status,
      updatedAt: new Date()
    }

    if (status === 'paid' || status === 'completed') {
      updateData.paymentTime = new Date()
      
      // 如果产品需要密钥，分配密钥
      if (order.products.stock !== -1) {
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
              orderId: order.id,
              userId: order.userId
            }
          })

          // 更新订单的密钥
          updateData.productKey = availableKey.key
        }
      }

      // 如果是会员产品，更新用户会员状态
      if (order.products.type === 'membership' && order.products.duration) {
        const existingMembership = await prisma.user_memberships.findUnique({
          where: { userId: order.userId }
        })

        const startDate = new Date()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + order.products.duration)

        if (existingMembership) {
          // 如果已有会员，延长会员时间
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
          // 创建新会员
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
    }

    const updatedOrder = await prisma.orders.update({
      where: { id: orderId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: '订单状态已更新'
    })
  } catch (error) {
    console.error('更新订单失败:', error)
    return NextResponse.json(
      { success: false, error: '更新订单失败' },
      { status: 500 }
    )
  }
}
