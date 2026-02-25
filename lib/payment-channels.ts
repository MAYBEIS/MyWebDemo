/**
 * 支付渠道配置模块
 * 
 * 支付渠道的定义（元数据）由代码管理，不依赖数据库存储。
 * 数据库仅存储渠道的启用状态和敏感配置信息。
 */

/**
 * 支付渠道配置字段定义
 */
export interface PaymentChannelConfigField {
  /** 字段标签（显示名称） */
  label: string
  /** 字段类型 */
  type: 'text' | 'password' | 'url'
  /** 占位符文本 */
  placeholder: string
  /** 是否必填 */
  required: boolean
  /** 配置键名（用于存储到数据库） */
  key: string
  /** 帮助提示 */
  helpText?: string
}

/**
 * 支付渠道定义（元数据）
 */
export interface PaymentChannelDefinition {
  /** 渠道代码（唯一标识） */
  code: string
  /** 渠道名称 */
  name: string
  /** 渠道描述 */
  description: string
  /** 渠道图标 */
  icon?: string
  /** 配置字段列表 */
  configFields: PaymentChannelConfigField[]
  /** 是否支持多种支付方式（如虎皮椒支持微信和支付宝） */
  supportedPaymentTypes?: Array<{
    code: string
    name: string
    icon: string
  }>
  /** 帮助文档链接 */
  helpUrl?: string
  /** 排序权重 */
  sortOrder: number
}

/**
 * 支付渠道运行时状态（从数据库加载）
 */
export interface PaymentChannelStatus {
  /** 渠道代码 */
  code: string
  /** 是否启用 */
  enabled: boolean
  /** 配置信息 */
  config: Record<string, string>
  /** 更新时间 */
  updatedAt?: Date
}

/**
 * 支付渠道完整信息（定义 + 状态）
 */
export interface PaymentChannel extends PaymentChannelDefinition {
  /** 是否启用 */
  enabled: boolean
  /** 配置信息 */
  config: Record<string, string>
  /** 更新时间 */
  updatedAt?: Date
}

// ==================== 支付渠道定义 ====================

/**
 * 所有支持的支付渠道定义
 * 渠道列表由代码定义，不依赖数据库存储
 */
export const PAYMENT_CHANNEL_DEFINITIONS: PaymentChannelDefinition[] = [
  {
    code: 'wechat',
    name: '微信支付',
    description: '支持微信扫码支付、H5支付等多种支付方式（需要商户资质）',
    icon: '💚',
    sortOrder: 1,
    configFields: [
      {
        label: '公众号AppID',
        type: 'text',
        placeholder: 'wx1234567890abcdef',
        required: true,
        key: 'appId',
        helpText: '微信公众号的应用ID'
      },
      {
        label: '商户号',
        type: 'text',
        placeholder: '1234567890',
        required: true,
        key: 'mchId',
        helpText: '微信支付商户号'
      },
      {
        label: 'API密钥',
        type: 'password',
        placeholder: '32位API密钥',
        required: true,
        key: 'apiKey',
        helpText: '微信支付API密钥（V2）'
      },
      {
        label: 'API V3密钥',
        type: 'password',
        placeholder: '32位API V3密钥（可选）',
        required: false,
        key: 'apiV3Key',
        helpText: '微信支付API V3密钥，用于新版API'
      },
      {
        label: '证书序列号',
        type: 'text',
        placeholder: '证书序列号（可选）',
        required: false,
        key: 'serialNo',
        helpText: '商户API证书序列号'
      },
      {
        label: '回调通知地址',
        type: 'url',
        placeholder: 'https://your-domain.com/api/shop/wechat-pay/notify',
        required: true,
        key: 'notifyUrl',
        helpText: '支付结果异步通知地址，必须是外网可访问的HTTPS地址'
      }
    ],
    helpUrl: 'https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml'
  },
  {
    code: 'alipay',
    name: '支付宝',
    description: '支持支付宝扫码支付、H5支付等多种支付方式（需要商户资质）',
    icon: '💳',
    sortOrder: 2,
    configFields: [
      {
        label: '应用ID',
        type: 'text',
        placeholder: '2021000000000000',
        required: true,
        key: 'appId',
        helpText: '支付宝应用ID'
      },
      {
        label: '应用私钥',
        type: 'password',
        placeholder: '应用私钥内容',
        required: true,
        key: 'privateKey',
        helpText: '应用私钥内容（RSA2）'
      },
      {
        label: '支付宝公钥',
        type: 'password',
        placeholder: '支付宝公钥内容',
        required: true,
        key: 'alipayPublicKey',
        helpText: '支付宝公钥内容'
      },
      {
        label: '回调通知地址',
        type: 'url',
        placeholder: 'https://your-domain.com/api/shop/alipay/notify',
        required: true,
        key: 'notifyUrl',
        helpText: '支付结果异步通知地址，必须是外网可访问的HTTPS地址'
      }
    ],
    helpUrl: 'https://opendocs.alipay.com/apis/api_1/alipay.trade.page.pay'
  },
  {
    code: 'xunhupay',
    name: '虎皮椒支付',
    description: '第三方聚合支付平台，支持微信和支付宝，个人开发者友好，无需商户资质',
    icon: '🌶️',
    sortOrder: 3,
    configFields: [
      {
        label: 'AppID',
        type: 'text',
        placeholder: '虎皮椒AppID',
        required: true,
        key: 'appid',
        helpText: '虎皮椒应用ID'
      },
      {
        label: 'AppSecret',
        type: 'password',
        placeholder: '虎皮椒密钥',
        required: true,
        key: 'appSecret',
        helpText: '虎皮椒应用密钥'
      },
      {
        label: '异步通知地址',
        type: 'url',
        placeholder: 'https://your-domain.com/api/shop/xunhupay/notify',
        required: false,
        key: 'notifyUrl',
        helpText: '支付结果异步通知地址'
      }
    ],
    supportedPaymentTypes: [
      { code: 'wechat', name: '微信支付', icon: '💚' },
      { code: 'alipay', name: '支付宝', icon: '💳' }
    ],
    helpUrl: 'https://www.xunhupay.com/doc'
  },
  {
    code: 'test',
    name: '测试支付',
    description: '用于开发测试的模拟支付渠道，无需真实支付即可完成订单',
    icon: '🧪',
    sortOrder: 4,
    configFields: [
      {
        label: '模拟支付延迟（毫秒）',
        type: 'text',
        placeholder: '1000',
        required: false,
        key: 'delay',
        helpText: '模拟支付处理的延迟时间，默认1000毫秒'
      },
      {
        label: '自动支付成功',
        type: 'text',
        placeholder: 'true/false',
        required: false,
        key: 'autoSuccess',
        helpText: '是否自动返回支付成功，默认true'
      }
    ],
    helpUrl: ''
  }
]

// ==================== 辅助函数 ====================

/**
 * 获取所有支付渠道定义
 */
export function getPaymentChannelDefinitions(): PaymentChannelDefinition[] {
  return PAYMENT_CHANNEL_DEFINITIONS
}

/**
 * 根据渠道代码获取渠道定义
 * @param code 渠道代码
 * @returns 渠道定义，不存在则返回 undefined
 */
export function getPaymentChannelDefinition(code: string): PaymentChannelDefinition | undefined {
  return PAYMENT_CHANNEL_DEFINITIONS.find(ch => ch.code === code)
}

/**
 * 获取渠道名称
 * @param code 渠道代码
 * @returns 渠道名称
 */
export function getPaymentChannelName(code: string): string {
  const definition = getPaymentChannelDefinition(code)
  return definition?.name || code
}

/**
 * 获取所有启用的支付渠道代码列表
 * @param statuses 渠道状态列表（从数据库加载）
 * @returns 启用的渠道代码列表
 */
export function getEnabledChannelCodes(statuses: PaymentChannelStatus[]): string[] {
  return statuses
    .filter(s => s.enabled)
    .map(s => s.code)
}

/**
 * 合并渠道定义和状态
 * @param definition 渠道定义
 * @param status 渠道状态（可选）
 * @returns 完整的渠道信息
 */
export function mergeChannelWithStatus(
  definition: PaymentChannelDefinition,
  status?: PaymentChannelStatus
): PaymentChannel {
  return {
    ...definition,
    enabled: status?.enabled ?? false,
    config: status?.config ?? {},
    updatedAt: status?.updatedAt
  }
}

/**
 * 合并所有渠道定义和状态
 * @param statuses 渠道状态列表（从数据库加载）
 * @returns 完整的渠道信息列表
 */
export function mergeAllChannelsWithStatuses(statuses: PaymentChannelStatus[]): PaymentChannel[] {
  return PAYMENT_CHANNEL_DEFINITIONS.map(definition => {
    const status = statuses.find(s => s.code === definition.code)
    return mergeChannelWithStatus(definition, status)
  })
}

/**
 * 验证渠道配置是否完整
 * @param code 渠道代码
 * @param config 配置信息
 * @returns 是否配置完整
 */
export function validateChannelConfig(code: string, config: Record<string, string>): {
  valid: boolean
  missingFields: string[]
} {
  const definition = getPaymentChannelDefinition(code)
  if (!definition) {
    return { valid: false, missingFields: ['渠道不存在'] }
  }

  const missingFields: string[] = []
  for (const field of definition.configFields) {
    if (field.required && !config[field.key]) {
      missingFields.push(field.label)
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields
  }
}

/**
 * 获取渠道配置字段定义
 * @param code 渠道代码
 * @returns 配置字段列表
 */
export function getChannelConfigFields(code: string): PaymentChannelConfigField[] {
  const definition = getPaymentChannelDefinition(code)
  return definition?.configFields ?? []
}

/**
 * 检查渠道是否存在
 * @param code 渠道代码
 * @returns 是否存在
 */
export function isPaymentChannelExists(code: string): boolean {
  return PAYMENT_CHANNEL_DEFINITIONS.some(ch => ch.code === code)
}

/**
 * 获取渠道支持的支付方式
 * @param code 渠道代码
 * @returns 支持的支付方式列表，如果不支持多种支付方式则返回 undefined
 */
export function getChannelSupportedPaymentTypes(code: string): PaymentChannelDefinition['supportedPaymentTypes'] {
  const definition = getPaymentChannelDefinition(code)
  return definition?.supportedPaymentTypes
}
