import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取产品密钥列表（管理员）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const status = searchParams.get('status')

    const where: any = {}
    if (productId) {
      where.productId = productId
    }
    if (status) {
      where.status = status
    }

    const keys = await prisma.product_keys.findMany({
      where,
      include: {
        products: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        orders: {
          select: {
            id: true,
            orderNo: true,
            userId: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: keys
    })
  } catch (error) {
    console.error('获取产品密钥列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取产品密钥列表失败' },
      { status: 500 }
    )
  }
}

// 批量创建产品密钥（管理员）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, keys, expiresInDays } = body

    if (!productId || !keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { success: false, error: '参数错误' },
        { status: 400 }
      )
    }

    // 检查产品是否存在
    const product = await prisma.products.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: '产品不存在' },
        { status: 404 }
      )
    }

    // 检查密钥是否已存在
    const existingKeys = await prisma.product_keys.findMany({
      where: {
        key: { in: keys }
      }
    })

    if (existingKeys.length > 0) {
      return NextResponse.json(
        { success: false, error: `以下密钥已存在: ${existingKeys.map(k => k.key).join(', ')}` },
        { status: 400 }
      )
    }

    // 计算过期时间
    let expiresAt: Date | null = null
    if (expiresInDays && parseInt(expiresInDays) > 0) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays))
    }

    // 批量创建密钥
    const keyData = keys.map((key: string) => ({
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId,
      key: key.trim(),
      status: 'available',
      expiresAt
    }))

    const result = await prisma.product_keys.createMany({
      data: keyData
    })

    return NextResponse.json({
      success: true,
      data: {
        count: result.count,
        message: `成功创建 ${result.count} 个密钥`
      }
    })
  } catch (error) {
    console.error('创建产品密钥失败:', error)
    return NextResponse.json(
      { success: false, error: '创建产品密钥失败' },
      { status: 500 }
    )
  }
}

// 删除产品密钥（管理员）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少密钥ID' },
        { status: 400 }
      )
    }

    // 检查密钥状态
    const key = await prisma.product_keys.findUnique({
      where: { id }
    })

    if (!key) {
      return NextResponse.json(
        { success: false, error: '密钥不存在' },
        { status: 404 }
      )
    }

    if (key.status === 'sold' || key.status === 'used') {
      return NextResponse.json(
        { success: false, error: '已售出或已使用的密钥不能删除' },
        { status: 400 }
      )
    }

    await prisma.product_keys.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '密钥已删除'
    })
  } catch (error) {
    console.error('删除产品密钥失败:', error)
    return NextResponse.json(
      { success: false, error: '删除产品密钥失败' },
      { status: 500 }
    )
  }
}
