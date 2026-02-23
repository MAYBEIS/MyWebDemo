/**
 * 易支付工具库
 * 第四方支付平台，支持微信支付和支付宝
 * API文档参考：https://www.yipay.cn/doc
 */

import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// 易支付配置类型
export interface EpayConfig {
  pid: string           // 商户ID
  key: string           // 商户密钥
  gateway: string       // 支付网关地址
  notifyUrl: string     // 异步通知地址
  returnUrl: string     // 同步跳转地址
}

// 支付请求参数
export interface EpayOrderParams {
  type: 'alipay' | 'wxpay' | 'qqpay'  // 支付方式
  outTradeNo: string    // 商户订单号
  notifyUrl?: string    // 异步通知地址
  returnUrl?: string    // 同步跳转地址
  name: string          // 商品名称
  money: string | number // 金额（元）
  device?: string       // 设备类型（pc/mobile）
  clientIp?: string     // 客户端IP
  param?: string        // 附加参数
}

// 支付响应
export interface EpayOrderResponse {
  code: number          // 状态码，1为成功
  msg: string           // 错误信息
  tradeNo?: string      // 易支付订单号
  outTradeNo?: string   // 商户订单号
  payUrl?: string       // 支付链接
  payQrcode?: string    // 支付二维码链接
}

// 异步通知数据
export interface EpayNotifyData {
  tradeNo: string       // 易支付订单号
  outTradeNo: string    // 商户订单号
  type: string          // 支付方式
  name: string          // 商品名称
  money: string         // 支付金额
  tradeStatus: string   // 交易状态 TRADE_SUCCESS
  param?: string        // 附加参数
  sign: string          // 签名
  signType: string      // 签名类型
}

/**
 * 从数据库获取易支付配置
 */
export async function getEpayConfigFromDB(): Promise<EpayConfig | null> {
  try {
    const channel = await prisma.payment_channels.findFirst({
      where: {
        code: 'epay',
        enabled: true
      }
    })

    if (!channel) {
      console.warn('易支付渠道未启用或不存在')
      return null
    }

    const config = typeof channel.config === 'string' 
      ? JSON.parse(channel.config) 
      : channel.config

    // 检查必要配置
    if (!config.pid || !config.key || !config.gateway) {
      console.warn('易支付配置不完整')
      return null
    }

    return {
      pid: config.pid,
      key: config.key,
      gateway: config.gateway,
      notifyUrl: config.notifyUrl || '',
      returnUrl: config.returnUrl || ''
    }
  } catch (error) {
    console.error('获取易支付配置失败:', error)
    return null
  }
}

/**
 * 获取易支付配置（从环境变量）
 */
export function getEpayConfig(): EpayConfig | null {
  const pid = process.env.EPAY_PID
  const key = process.env.EPAY_KEY
  const gateway = process.env.EPAY_GATEWAY
  const notifyUrl = process.env.EPAY_NOTIFY_URL
  const returnUrl = process.env.EPAY_RETURN_URL

  if (!pid || !key || !gateway) {
    console.warn('易支付配置不完整，请检查环境变量')
    return null
  }

  return {
    pid,
    key,
    gateway,
    notifyUrl: notifyUrl || '',
    returnUrl: returnUrl || ''
  }
}

/**
 * 生成签名
 * 易支付签名规则：将所有参数按字母顺序排序，拼接成key=value&格式，最后拼接密钥
 */
export function generateEpaySign(params: Record<string, any>, key: string): string {
  // 过滤空值和sign参数
  const filteredParams: Record<string, string> = {}
  for (const k in params) {
    if (params[k] !== '' && params[k] !== undefined && params[k] !== null && k !== 'sign' && k !== 'sign_type') {
      filteredParams[k] = String(params[k])
    }
  }
  
  // 按字母顺序排序
  const sortedKeys = Object.keys(filteredParams).sort()
  
  // 拼接字符串
  const signStr = sortedKeys.map(k => `${k}=${filteredParams[k]}`).join('&')
  
  // 拼接密钥并MD5加密
  const sign = crypto.createHash('md5').update(signStr + key, 'utf8').digest('hex')
  
  return sign
}

/**
 * 验证签名
 */
export function verifyEpaySign(params: Record<string, any>, key: string): boolean {
  const sign = params.sign
  if (!sign) return false

  const calculatedSign = generateEpaySign(params, key)
  return sign.toLowerCase() === calculatedSign.toLowerCase()
}

/**
 * 创建支付订单
 * 返回支付链接或二维码URL
 */
export async function createEpayOrder(
  config: EpayConfig,
  params: EpayOrderParams
): Promise<EpayOrderResponse> {
  // 构建请求参数
  const requestParams: Record<string, any> = {
    pid: config.pid,
    type: params.type,
    out_trade_no: params.outTradeNo,
    notify_url: params.notifyUrl || config.notifyUrl,
    return_url: params.returnUrl || config.returnUrl,
    name: params.name,
    money: params.money,
    device: params.device || 'pc',
    clientip: params.clientIp || '127.0.0.1',
    ...(params.param && { param: params.param })
  }

  // 生成签名
  requestParams.sign = generateEpaySign(requestParams, config.key)
  requestParams.sign_type = 'MD5'

  try {
    // 构建支付URL
    const queryString = Object.keys(requestParams)
      .map(k => `${k}=${encodeURIComponent(requestParams[k])}`)
      .join('&')
    
    const payUrl = `${config.gateway}/submit.php?${queryString}`
    
    // 也可以调用API接口获取二维码
    const apiUrl = `${config.gateway}/mapi.php`
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: queryString
    })

    const result = await response.json()
    
    if (result.code === 1) {
      return {
        code: 1,
        msg: 'success',
        tradeNo: result.tradeNo,
        outTradeNo: result.outTradeNo,
        payUrl: payUrl,
        payQrcode: result.qrcode || result.payUrl
      }
    } else {
      return {
        code: 0,
        msg: result.msg || '创建订单失败'
      }
    }
  } catch (error) {
    console.error('创建易支付订单失败:', error)
    return {
      code: 0,
      msg: '网络请求失败'
    }
  }
}

/**
 * 查询订单状态
 */
export async function queryEpayOrder(
  config: EpayConfig,
  outTradeNo: string
): Promise<Record<string, any>> {
  const requestParams: Record<string, any> = {
    pid: config.pid,
    out_trade_no: outTradeNo
  }

  requestParams.sign = generateEpaySign(requestParams, config.key)
  requestParams.sign_type = 'MD5'

  try {
    const queryString = Object.keys(requestParams)
      .map(k => `${k}=${encodeURIComponent(requestParams[k])}`)
      .join('&')

    const response = await fetch(`${config.gateway}/api.php?act=order&${queryString}`)
    const result = await response.json()

    return result
  } catch (error) {
    console.error('查询易支付订单失败:', error)
    return {
      code: -1,
      msg: '网络请求失败'
    }
  }
}

/**
 * 金额格式化
 * 保留两位小数
 */
export function formatMoney(amount: number): string {
  return amount.toFixed(2)
}

/**
 * 生成订单号
 */
export function generateEpayOrderNo(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substr(2, 8).toUpperCase()
  return `EP${year}${month}${day}${random}`
}

/**
 * 获取支付方式显示名称
 */
export function getPaymentTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    'alipay': '支付宝',
    'wxpay': '微信支付',
    'qqpay': 'QQ钱包'
  }
  return typeMap[type] || type
}

/**
 * 生成支付成功响应
 */
export function generateEpaySuccessResponse(): string {
  return 'success'
}

/**
 * 生成支付失败响应
 */
export function generateEpayFailResponse(msg: string = 'fail'): string {
  return `fail: ${msg}`
}
