import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getPaymentChannelDefinitions,
  type PaymentChannelStatus,
} from '@/lib/payment-channels'

/**
 * 获取公开的支付渠道列表（已启用的渠道，不包含敏感配置）
 * GET /api/shop/payment-channels/public
 * 
 * 此接口不需要管理员权限，任何登录用户都可以访问
 * 返回已启用的支付渠道基本信息，敏感配置字段会被过滤
 */
export async function GET(request: NextRequest) {
  try {
    // 从数据库获取支付渠道状态（启用状态和配置）
    const channelStatusesFromDb = await prisma.payment_channels.findMany()

    // 转换为标准格式
    const statuses: PaymentChannelStatus[] = channelStatusesFromDb.map(ch => ({
      code: ch.code,
      enabled: ch.enabled,
      config: typeof ch.config === 'string' ? JSON.parse(ch.config) : ch.config,
      updatedAt: ch.updatedAt
    }))

    // 获取渠道定义
    const definitions = getPaymentChannelDefinitions()

    // 合并代码定义和数据库状态，只返回已启用的渠道
    const enabledChannels = definitions
      .filter(definition => {
        const status = statuses.find(s => s.code === definition.code)
        return status?.enabled ?? false
      })
      .map(definition => {
        const status = statuses.find(s => s.code === definition.code)
        
        // 过滤敏感配置字段，只返回非敏感信息
        const safeConfig: Record<string, string> = {}
        if (status?.config) {
          // 只保留非敏感配置（如 enabledPaymentTypes）
          const nonSensitiveKeys = ['enabledPaymentTypes', 'delay', 'autoSuccess']
          nonSensitiveKeys.forEach(key => {
            if (status.config[key] !== undefined) {
              safeConfig[key] = status.config[key]
            }
          })
        }

        return {
          code: definition.code,
          name: definition.name,
          icon: definition.icon,
          description: definition.description,
          supportedPaymentTypes: definition.supportedPaymentTypes,
          config: safeConfig
        }
      })

    return NextResponse.json({
      success: true,
      data: enabledChannels
    })
  } catch (error) {
    console.error('获取支付渠道失败:', error)
    return NextResponse.json(
      { success: false, error: '获取支付渠道失败' },
      { status: 500 }
    )
  }
}
