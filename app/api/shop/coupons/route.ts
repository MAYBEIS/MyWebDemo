import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-service'

/**
 * 验证优惠券
 * GET /api/shop/coupons?code=COUPON_CODE&amount=100
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const amount = parseFloat(searchParams.get('amount') || '0')

    if (!code) {
      return NextResponse.json(
        { success: false, error: '请输入优惠券代码' },
        { status: 400 }
      )
    }

    // 查找优惠券
    const coupon = await prisma.coupons.findUnique({
      where: { code }
    })

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: '优惠券不存在' },
        { status: 404 }
      )
    }

    // 检查优惠券状态
    if (!coupon.status) {
      return NextResponse.json(
        { success: false, error: '优惠券已禁用' },
        { status: 400 }
      )
    }

    // 检查有效期
    const now = new Date()
    if (now < coupon.startTime || now > coupon.endTime) {
      return NextResponse.json(
        { success: false, error: '优惠券已过期或未生效' },
        { status: 400 }
      )
    }

    // 检查使用次数
    if (coupon.totalCount !== -1 && coupon.usedCount >= coupon.totalCount) {
      return NextResponse.json(
        { success: false, error: '优惠券已被领完' },
        { status: 400 }
      )
    }

    // 检查最低订单金额
    if (amount < coupon.minAmount) {
      return NextResponse.json(
        { success: false, error: `订单金额需满 ¥${coupon.minAmount.toFixed(2)} 才能使用此优惠券` },
        { status: 400 }
      )
    }

    // 计算折扣金额
    let discountAmount = 0
    if (coupon.type === 'percentage') {
      discountAmount = amount * (coupon.value / 100)
      // 检查最大折扣金额
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount
      }
    } else {
      // 固定金额折扣
      discountAmount = coupon.value
      // 折扣金额不能超过订单金额
      if (discountAmount > amount) {
        discountAmount = amount
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        discountAmount,
        finalAmount: amount - discountAmount,
        minAmount: coupon.minAmount,
        maxDiscount: coupon.maxDiscount
      }
    })
  } catch (error) {
    console.error('验证优惠券失败:', error)
    return NextResponse.json(
      { success: false, error: '验证优惠券失败' },
      { status: 500 }
    )
  }
}

/**
 * 创建优惠券（管理员）
 * POST /api/shop/coupons
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const token = request.cookies.get('auth_token')?.value || request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { code, name, type, value, minAmount, maxDiscount, totalCount, startTime, endTime } = body

    if (!code || !name || !type || value === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 检查优惠券代码是否已存在
    const existingCoupon = await prisma.coupons.findUnique({
      where: { code }
    })

    if (existingCoupon) {
      return NextResponse.json(
        { success: false, error: '优惠券代码已存在' },
        { status: 400 }
      )
    }

    // 创建优惠券
    const coupon = await prisma.coupons.create({
      data: {
        id: `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        code,
        name,
        type,
        value: parseFloat(value),
        minAmount: parseFloat(minAmount || 0),
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        totalCount: parseInt(totalCount || -1),
        usedCount: 0,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: true
      }
    })

    return NextResponse.json({
      success: true,
      data: coupon,
      message: '优惠券创建成功'
    })
  } catch (error) {
    console.error('创建优惠券失败:', error)
    return NextResponse.json(
      { success: false, error: '创建优惠券失败' },
      { status: 500 }
    )
  }
}

/**
 * 更新优惠券（管理员）
 * PUT /api/shop/coupons
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员权限
    const token = request.cookies.get('auth_token')?.value || request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, status, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少优惠券ID' },
        { status: 400 }
      )
    }

    // 构建更新数据
    const data: any = { updatedAt: new Date() }
    if (status !== undefined) data.status = status
    if (updateData.name) data.name = updateData.name
    if (updateData.minAmount !== undefined) data.minAmount = parseFloat(updateData.minAmount)
    if (updateData.maxDiscount !== undefined) data.maxDiscount = parseFloat(updateData.maxDiscount)
    if (updateData.totalCount !== undefined) data.totalCount = parseInt(updateData.totalCount)
    if (updateData.startTime) data.startTime = new Date(updateData.startTime)
    if (updateData.endTime) data.endTime = new Date(updateData.endTime)

    const coupon = await prisma.coupons.update({
      where: { id },
      data
    })

    return NextResponse.json({
      success: true,
      data: coupon,
      message: '优惠券更新成功'
    })
  } catch (error) {
    console.error('更新优惠券失败:', error)
    return NextResponse.json(
      { success: false, error: '更新优惠券失败' },
      { status: 500 }
    )
  }
}

/**
 * 删除优惠券（管理员）
 * DELETE /api/shop/coupons?id=COUPON_ID
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证管理员权限
    const token = request.cookies.get('auth_token')?.value || request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少优惠券ID' },
        { status: 400 }
      )
    }

    await prisma.coupons.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '优惠券已删除'
    })
  } catch (error) {
    console.error('删除优惠券失败:', error)
    return NextResponse.json(
      { success: false, error: '删除优惠券失败' },
      { status: 500 }
    )
  }
}
