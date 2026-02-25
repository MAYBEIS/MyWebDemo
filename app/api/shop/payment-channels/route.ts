import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-service'
import { prisma } from '@/lib/prisma'
import {
  getPaymentChannelDefinitions,
  mergeAllChannelsWithStatuses,
  isPaymentChannelExists,
  type PaymentChannelStatus,
} from '@/lib/payment-channels'

/**
 * 获取支付渠道列表
 * GET /api/shop/payment-channels
 * 
 * 渠道定义由代码管理，数据库仅存储启用状态和配置信息
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

    // 从数据库获取支付渠道状态（启用状态和配置）
    const channelStatusesFromDb = await prisma.payment_channels.findMany()

    // 转换为标准格式
    const statuses: PaymentChannelStatus[] = channelStatusesFromDb.map(ch => ({
      code: ch.code,
      enabled: ch.enabled,
      config: typeof ch.config === 'string' ? JSON.parse(ch.config) : ch.config,
      updatedAt: ch.updatedAt
    }))

    // 合并代码定义和数据库状态
    const channels = mergeAllChannelsWithStatuses(statuses)

    return NextResponse.json({
      success: true,
      data: channels
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
 * 
 * 只更新启用状态和配置信息，渠道定义由代码管理
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

    // 验证渠道是否存在（检查代码定义）
    if (!isPaymentChannelExists(code)) {
      return NextResponse.json(
        { success: false, error: '支付渠道不存在' },
        { status: 404 }
      )
    }

    // 查找数据库中的渠道状态记录
    let channelStatus = await prisma.payment_channels.findFirst({
      where: { code }
    })

    // 如果数据库中没有记录，创建一条新记录
    if (!channelStatus) {
      channelStatus = await prisma.payment_channels.create({
        data: {
          id: `channel_${code}_${Date.now()}`,
          code,
          name: '', // 名称由代码定义，数据库中留空
          enabled: false,
          config: '{}'
        }
      })
    }

    // 构建更新数据
    const updateData: {
      updatedAt: Date
      enabled?: boolean
      config?: string
    } = {
      updatedAt: new Date()
    }

    if (enabled !== undefined) {
      updateData.enabled = enabled
    }

    if (config !== undefined) {
      // 合并现有配置和新配置
      const existingConfig = typeof channelStatus.config === 'string'
        ? JSON.parse(channelStatus.config)
        : channelStatus.config
      updateData.config = JSON.stringify({
        ...existingConfig,
        ...config
      })
    }

    // 更新渠道状态
    const updatedStatus = await prisma.payment_channels.update({
      where: { id: channelStatus.id },
      data: updateData
    })

    // 返回合并后的完整渠道信息
    const definitions = getPaymentChannelDefinitions()
    const definition = definitions.find(d => d.code === code)
    
    const result = {
      ...definition,
      code: updatedStatus.code,
      enabled: updatedStatus.enabled,
      config: typeof updatedStatus.config === 'string'
        ? JSON.parse(updatedStatus.config)
        : updatedStatus.config,
      updatedAt: updatedStatus.updatedAt
    }

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('更新支付渠道失败:', error)
    return NextResponse.json(
      { success: false, error: '更新支付渠道失败' },
      { status: 500 }
    )
  }
}
