import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取产品列表（公开）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const where: any = {}
    
    // 只显示上架的产品
    if (status === 'all') {
      // 管理员查看所有产品
    } else {
      where.status = true
    }
    
    if (type) {
      where.type = type
    }

    const products = await prisma.products.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ],
      include: {
        _count: {
          select: {
            product_keys: {
              where: { status: 'available' }
            }
          }
        }
      }
    })

    // 处理产品数据，添加可用库存
    const productsWithStock = products.map(product => ({
      ...product,
      availableStock: product.stock === -1 ? -1 : product._count.product_keys
    }))

    return NextResponse.json({
      success: true,
      data: productsWithStock
    })
  } catch (error) {
    console.error('获取产品列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取产品列表失败' },
      { status: 500 }
    )
  }
}

// 创建产品（管理员）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, price, type, duration, features, image, stock, sortOrder } = body

    // 生成唯一ID
    const id = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const product = await prisma.products.create({
      data: {
        id,
        name,
        description: description || '',
        price: parseFloat(price),
        type,
        duration: duration ? parseInt(duration) : null,
        features: features ? JSON.stringify(features) : null,
        image,
        stock: stock ? parseInt(stock) : -1,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        status: true
      }
    })

    return NextResponse.json({
      success: true,
      data: product
    })
  } catch (error) {
    console.error('创建产品失败:', error)
    return NextResponse.json(
      { success: false, error: '创建产品失败' },
      { status: 500 }
    )
  }
}

// 更新产品（管理员）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, price, type, duration, features, image, stock, sortOrder, status } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: '产品ID不能为空' },
        { status: 400 }
      )
    }

    const product = await prisma.products.update({
      where: { id },
      data: {
        name,
        description: description || '',
        price: parseFloat(price),
        type,
        duration: duration ? parseInt(duration) : null,
        features: features ? JSON.stringify(features) : null,
        image,
        stock: stock ? parseInt(stock) : -1,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        status: status !== undefined ? status : true
      }
    })

    return NextResponse.json({
      success: true,
      data: product
    })
  } catch (error) {
    console.error('更新产品失败:', error)
    return NextResponse.json(
      { success: false, error: '更新产品失败' },
      { status: 500 }
    )
  }
}

// 删除产品（管理员）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: '产品ID不能为空' },
        { status: 400 }
      )
    }

    // 检查是否有关联的订单
    const ordersCount = await prisma.orders.count({
      where: { productId: id }
    })

    if (ordersCount > 0) {
      return NextResponse.json(
        { success: false, error: '该产品已有订单，无法删除' },
        { status: 400 }
      )
    }

    // 删除关联的密钥
    await prisma.product_keys.deleteMany({
      where: { productId: id }
    })

    // 删除产品
    await prisma.products.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '产品已删除'
    })
  } catch (error) {
    console.error('删除产品失败:', error)
    return NextResponse.json(
      { success: false, error: '删除产品失败' },
      { status: 500 }
    )
  }
}
