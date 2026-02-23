import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-service'
import { prisma } from '@/lib/prisma'

// 默认支付渠道
const DEFAULT_CHANNELS = [
  {
    code: 'wechat',
    name: '微信支付',
    description: '支持微信扫码支付、H5支付等多种支付方式（需要商户资质）',
    enabled: false,
    config: {}
  },
  {
    code: 'alipay',
    name: '支付宝',
    description: '支持支付宝扫码支付、H5支付等多种支付方式（需要商户资质）',
    enabled: false,
    config: {}
  },
  {
    code: 'epay',
    name: '易支付',
    description: '第四方聚合支付平台，支持微信和支付宝，个人开发者友好，无需商户资质',
    enabled: false,
    config: {}
  }
]

/**
 * 获取支付渠道列表
 * GET /api/shop/payment-channels
 */
export async function GET(request: NextRequest) {
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

    // 从数据库获取支付渠道配置
    let channels = await prisma.payment_channels.findMany()

    // 如果数据库中没有渠道，初始化默认渠道
    if (channels.length === 0) {
      for (const channel of DEFAULT_CHANNELS) {
        await prisma.payment_channels.create({
          data: {
            id: `channel_${channel.code}_${Date.now()}`,
            code: channel.code,
            name: channel.name,
            description: channel.description,
            enabled: channel.enabled,
            config: JSON.stringify(channel.config)
          }
        })
      }
      channels = await prisma.payment_channels.findMany()
    }

    // 解析配置JSON
    const parsedChannels = channels.map(channel => ({
      ...channel,
      config: typeof channel.config === 'string' ? JSON.parse(channel.config) : channel.config
    }))

    return NextResponse.json({
      success: true,
      data: parsedChannels
    })
  } catch (error) {
    console.error('获取支付渠道失败:', error)
    return NextResponse.json(
      { success: false, error: '获取支付渠道失败' },
      { status: 500 }
    )
  }
}

/**
 * 更新支付渠道配置
 * PUT /api/shop/payment-channels
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
    const { code, enabled, config } = body

    if (!code) {
      return NextResponse.json(
        { success: false, error: '缺少渠道代码' },
        { status: 400 }
      )
    }

    // 查找渠道
    const channel = await prisma.payment_channels.findFirst({
      where: { code }
    })

    if (!channel) {
      return NextResponse.json(
        { success: false, error: '支付渠道不存在' },
        { status: 404 }
      )
    }

    // 构建更新数据
    const updateData: any = {
      updatedAt: new Date()
    }

    if (enabled !== undefined) {
      updateData.enabled = enabled
    }

    if (config !== undefined) {
      // 合并现有配置和新配置
      const existingConfig = typeof channel.config === 'string' 
        ? JSON.parse(channel.config) 
        : channel.config
      updateData.config = JSON.stringify({
        ...existingConfig,
        ...config
      })
    }

    // 更新渠道
    const updatedChannel = await prisma.payment_channels.update({
      where: { id: channel.id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updatedChannel,
        config: typeof updatedChannel.config === 'string' 
          ? JSON.parse(updatedChannel.config) 
          : updatedChannel.config
      }
    })
  } catch (error) {
    console.error('更新支付渠道失败:', error)
    return NextResponse.json(
      { success: false, error: '更新支付渠道失败' },
      { status: 500 }
    )
  }
}