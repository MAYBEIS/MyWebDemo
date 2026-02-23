/**
 * 虎皮椒支付SDK (XunhuPay)
 * 官方文档: https://www.xunhupay.com/doc
 * 支持微信支付、支付宝
 */

import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// 虎皮椒支付配置类型
export interface XunhuPayConfig {
  appid: string       // 虎皮椒APPID
  appSecret: string   // 虎皮椒密钥
  notifyUrl: string   // 异步通知地址
}

// 支付请求参数
export interface XunhuPayOrderParams {
  trade_order_id: string    // 商户订单号
  total_fee: number         // 金额（元）
  title: string             // 商品名称
  type?: 'WAP' | 'NATIVE'   // 支付类型：WAP-手机网站支付，NATIVE-扫码支付
  wap_url?: string          // WAP支付时的网站URL
  wap_name?: string         // WAP支付时的网站名称
  nonce_str?: string        // 随机字符串
  time?: string             // 时间戳
}

// 支付响应
export interface XunhuPayResponse {
  err_code: number      // 错误码，0表示成功
  err_msg: string       // 错误信息
  url?: string          // 支付链接（WAP支付）
  url_qrcode?: string   // 二维码链接（NATIVE支付）
  order_id?: string     // 虎皮椒订单号
  out_trade_order?: string  // 商户订单号
}

// 异步通知数据
export interface XunhuPayNotifyData {
  appid: string
  trade_order_id: string    // 商户订单号
  out_trade_order: string   // 虎皮椒订单号
  total_fee: string         // 支付金额
  status: string            // 订单状态：OD-支付成功
  title: string             // 商品名称
  time: string              // 支付时间
  hash: string              // 签名
  nonce_str: string         // 随机字符串
  type: string              // 支付类型
}

/**
 * 从数据库获取虎皮椒支付配置
 */
export async function getXunhuPayConfigFromDB(): Promise<XunhuPayConfig | null> {
  try {
    const channel = await prisma.payment_channels.findFirst({
      where: {
        code: 'xunhupay',
        enabled: true
      }
    })

    if (!channel) {
      console.warn('虎皮椒支付渠道未启用或不存在')
      return null
    }

    const config = typeof channel.config === 'string' 
      ? JSON.parse(channel.config) 
      : channel.config

    // 检查必要配置
    if (!config.appid || !config.appSecret) {
      console.warn('虎皮椒支付配置不完整')
      return null
    }

    return {
      appid: config.appid,
      appSecret: config.appSecret,
      notifyUrl: config.notifyUrl || ''
    }
  } catch (error) {
    console.error('获取虎皮椒支付配置失败:', error)
    return null
  }
}

/**
 * 获取虎皮椒支付配置（从环境变量）
 */
export function getXunhuPayConfig(): XunhuPayConfig | null {
  const appid = process.env.XUNHUPAY_APPID
  const appSecret = process.env.XUNHUPAY_APPSECRET
  const notifyUrl = process.env.XUNHUPAY_NOTIFY_URL

  if (!appid || !appSecret) {
    console.warn('虎皮椒支付配置不完整，请检查环境变量')
    return null
  }

  return {
    appid,
    appSecret,
    notifyUrl: notifyUrl || ''
  }
}

/**
 * 生成签名
 * 虎皮椒签名规则：将所有非空参数按字母顺序排序，拼接成key=value&格式，最后拼接密钥，进行MD5加密
 */
export function generateHash(params: Record<string, any>, appSecret: string): string {
  // 过滤空值和hash参数
  const filteredParams: Record<string, string> = {}
  for (const k in params) {
    if (params[k] !== '' && params[k] !== undefined && params[k] !== null && k !== 'hash') {
      filteredParams[k] = String(params[k])
    }
  }
  
  // 按字母顺序排序
  const sortedKeys = Object.keys(filteredParams).sort()
  
  // 拼接字符串
  const signStr = sortedKeys.map(k => `${k}=${filteredParams[k]}`).join('&')
  
  // 拼接密钥并MD5加密
  const hash = crypto.createHash('md5').update(signStr + appSecret, 'utf8').digest('hex')
  
  return hash
}

/**
 * 验证签名
 */
export function verifyHash(params: Record<string, any>, appSecret: string): boolean {
  const hash = params.hash
  if (!hash) return false

  const calculatedHash = generateHash(params, appSecret)
  return hash.toLowerCase() === calculatedHash.toLowerCase()
}

/**
 * 生成随机字符串
 */
export function generateNonceStr(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 获取当前时间字符串 (YYYY-MM-DD HH:mm:ss)
 */
export function nowDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 创建支付订单
 * 支持微信支付和支付宝
 */
export async function createXunhuPayOrder(
  config: XunhuPayConfig,
  params: XunhuPayOrderParams,
  payType: 'wechat' | 'alipay' = 'wechat'
): Promise<XunhuPayResponse> {
  // 构建请求参数
  const requestParams: Record<string, any> = {
    version: '1.1',
    appid: config.appid,
    trade_order_id: params.trade_order_id,
    total_fee: params.total_fee.toFixed(2),
    title: params.title,
    time: params.time || nowDate(),
    notify_url: config.notifyUrl,
    nonce_str: params.nonce_str || generateNonceStr(),
    type: params.type || 'NATIVE',
  }

  // 如果是WAP支付，需要添加wap_url和wap_name
  if (requestParams.type === 'WAP') {
    requestParams.wap_url = params.wap_url || 'http://example.com'
    requestParams.wap_name = params.wap_name || '在线支付'
  }

  // 生成签名
  requestParams.hash = generateHash(requestParams, config.appSecret)

  try {
    // 根据支付类型选择API地址
    const apiUrl = payType === 'alipay' 
      ? 'https://api.xunhupay.com/payment/alipay.html'
      : 'https://api.xunhupay.com/payment/do.html'

    // 构建请求体
    const formData = new URLSearchParams()
    for (const key in requestParams) {
      formData.append(key, String(requestParams[key]))
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    })

    const result = await response.json()
    
    if (result.err_code === 0) {
      return {
        err_code: 0,
        err_msg: 'success',
        url: result.url,
        url_qrcode: result.url_qrcode,
        order_id: result.order_id,
        out_trade_order: result.out_trade_order
      }
    } else {
      return {
        err_code: result.err_code || -1,
        err_msg: result.err_msg || '创建订单失败'
      }
    }
  } catch (error) {
    console.error('创建虎皮椒支付订单失败:', error)
    return {
      err_code: -1,
      err_msg: '网络请求失败'
    }
  }
}

/**
 * 查询订单状态
 */
export async function queryXunhuPayOrder(
  config: XunhuPayConfig,
  tradeOrderId: string
): Promise<Record<string, any>> {
  const requestParams: Record<string, any> = {
    appid: config.appid,
    trade_order_id: tradeOrderId,
    time: nowDate(),
    nonce_str: generateNonceStr()
  }

  requestParams.hash = generateHash(requestParams, config.appSecret)

  try {
    const formData = new URLSearchParams()
    for (const key in requestParams) {
      formData.append(key, String(requestParams[key]))
    }

    const response = await fetch('https://api.xunhupay.com/payment/query.html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('查询虎皮椒订单失败:', error)
    return {
      err_code: -1,
      err_msg: '网络请求失败'
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
export function generateXunhuPayOrderNo(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substr(2, 8).toUpperCase()
  return `XH${year}${month}${day}${random}`
}

/**
 * 获取支付方式显示名称
 */
export function getPaymentTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    'wechat': '微信支付',
    'alipay': '支付宝'
  }
  return typeMap[type] || type
}

/**
 * 生成支付成功响应
 */
export function generateXunhuPaySuccessResponse(): string {
  return 'success'
}

/**
 * 生成支付失败响应
 */
export function generateXunhuPayFailResponse(msg: string = 'fail'): string {
  return `fail: ${msg}`
}
