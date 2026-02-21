/**
 * 微信支付工具库
 * 支持微信Native支付（扫码支付）和H5支付
 */

import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// 微信支付配置类型
export interface WechatPayConfig {
  appId: string          // 公众号AppID
  mchId: string          // 商户号
  apiKey: string         // API密钥（V2）
  apiV3Key?: string      // API V3密钥
  serialNo?: string      // 证书序列号
  privateKey?: string    // 商户私钥
  notifyUrl: string      // 支付回调通知地址
}

// 统一下单请求参数
export interface UnifiedOrderParams {
  body: string           // 商品描述
  outTradeNo: string     // 商户订单号
  totalFee: number       // 金额（分）
  spbillCreateIp: string // 终端IP
  tradeType: 'NATIVE' | 'JSAPI' | 'H5' | 'APP'  // 交易类型
  productId?: string     // 商品ID
  openid?: string        // 用户标识（JSAPI必填）
  deviceInfo?: string    // 设备号
  attach?: string        // 附加数据
  timeStart?: string     // 交易起始时间
  timeExpire?: string    // 交易结束时间
  goodsTag?: string      // 商品标记
  limitPay?: string      // 指定支付方式
}

// 统一下单响应
export interface UnifiedOrderResponse {
  returnCode: string
  returnMsg: string
  resultCode?: string
  errCode?: string
  errCodeDes?: string
  appId?: string
  mchId?: string
  nonceStr?: string
  sign?: string
  prepayId?: string      // 预支付交易会话标识
  tradeType?: string
  codeUrl?: string       // 二维码链接（NATIVE支付）
  mwebUrl?: string       // H5支付跳转链接
}

// 支付回调通知数据
export interface PayNotifyData {
  returnCode: string
  returnMsg: string
  appId: string
  mchId: string
  nonceStr: string
  sign: string
  resultCode: string
  errCode?: string
  errCodeDes?: string
  openid: string
  tradeType: string
  bankType: string
  totalFee: number
  cashFee: number
  transactionId: string
  outTradeNo: string
  timeEnd: string
  attach?: string
}

/**
 * 从数据库获取微信支付配置
 */
export async function getWechatPayConfigFromDB(): Promise<WechatPayConfig | null> {
  try {
    const channel = await prisma.payment_channels.findFirst({
      where: {
        code: 'wechat',
        enabled: true
      }
    })

    if (!channel) {
      console.warn('微信支付渠道未启用或不存在')
      return null
    }

    const config = typeof channel.config === 'string' 
      ? JSON.parse(channel.config) 
      : channel.config

    // 检查必要配置
    if (!config.appId || !config.mchId || !config.apiKey || !config.notifyUrl) {
      console.warn('微信支付配置不完整')
      return null
    }

    return {
      appId: config.appId,
      mchId: config.mchId,
      apiKey: config.apiKey,
      apiV3Key: config.apiV3Key,
      serialNo: config.serialNo,
      privateKey: config.privateKey,
      notifyUrl: config.notifyUrl
    }
  } catch (error) {
    console.error('获取微信支付配置失败:', error)
    return null
  }
}

/**
 * 获取微信支付配置（优先从数据库获取，其次从环境变量）
 */
export function getWechatPayConfig(): WechatPayConfig | null {
  const appId = process.env.WECHAT_PAY_APP_ID
  const mchId = process.env.WECHAT_PAY_MCH_ID
  const apiKey = process.env.WECHAT_PAY_API_KEY
  const notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL

  if (!appId || !mchId || !apiKey || !notifyUrl) {
    console.warn('微信支付配置不完整，请检查环境变量或数据库配置')
    return null
  }

  return {
    appId,
    mchId,
    apiKey,
    apiV3Key: process.env.WECHAT_PAY_API_V3_KEY,
    serialNo: process.env.WECHAT_PAY_SERIAL_NO,
    privateKey: process.env.WECHAT_PAY_PRIVATE_KEY,
    notifyUrl
  }
}

/**
 * 生成随机字符串
 */
export function generateNonceStr(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 生成签名（MD5方式）
 */
export function generateSign(params: Record<string, any>, apiKey: string): string {
  // 按字典序排序参数
  const sortedKeys = Object.keys(params).filter(key => {
    return params[key] !== undefined && params[key] !== '' && key !== 'sign'
  }).sort()

  // 拼接字符串
  const stringA = sortedKeys.map(key => {
    return `${key}=${params[key]}`
  }).join('&')

  // 拼接API密钥
  const stringSignTemp = `${stringA}&key=${apiKey}`

  // MD5签名并转大写
  return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase()
}

/**
 * 验证签名
 */
export function verifySign(params: Record<string, any>, apiKey: string): boolean {
  const sign = params.sign
  if (!sign) return false

  const calculatedSign = generateSign(params, apiKey)
  return sign === calculatedSign
}

/**
 * 对象转XML
 */
export function objectToXml(obj: Record<string, any>): string {
  let xml = '<xml>'
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (value !== undefined && value !== '') {
      // CDATA包裹文本内容
      xml += `<${key}><![CDATA[${value}]]></${key}>`
    }
  }
  xml += '</xml>'
  return xml
}

/**
 * XML转对象
 */
export function xmlToObject(xml: string): Record<string, string> {
  const result: Record<string, string> = {}
  const regex = /<(\w+)>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/\1>/g
  let match
  while ((match = regex.exec(xml)) !== null) {
    const key = match[1]
    const value = match[2] || match[3] || ''
    result[key] = value
  }
  return result
}

/**
 * 统一下单
 */
export async function unifiedOrder(
  config: WechatPayConfig,
  params: UnifiedOrderParams
): Promise<UnifiedOrderResponse> {
  const nonceStr = generateNonceStr()
  
  // 构建请求参数
  const requestParams: Record<string, any> = {
    appid: config.appId,
    mch_id: config.mchId,
    nonce_str: nonceStr,
    body: params.body,
    out_trade_no: params.outTradeNo,
    total_fee: params.totalFee,
    spbill_create_ip: params.spbillCreateIp,
    notify_url: config.notifyUrl,
    trade_type: params.tradeType,
    ...(params.productId && { product_id: params.productId }),
    ...(params.openid && { openid: params.openid }),
    ...(params.deviceInfo && { device_info: params.deviceInfo }),
    ...(params.attach && { attach: params.attach }),
    ...(params.timeStart && { time_start: params.timeStart }),
    ...(params.timeExpire && { time_expire: params.timeExpire }),
    ...(params.goodsTag && { goods_tag: params.goodsTag }),
    ...(params.limitPay && { limit_pay: params.limitPay })
  }

  // 生成签名
  requestParams.sign = generateSign(requestParams, config.apiKey)

  // 转换为XML
  const xmlData = objectToXml(requestParams)

  try {
    // 调用微信统一下单接口
    const response = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      body: xmlData
    })

    const responseText = await response.text()
    const result = xmlToObject(responseText)

    return {
      returnCode: result.return_code || '',
      returnMsg: result.return_msg || '',
      resultCode: result.result_code,
      errCode: result.err_code,
      errCodeDes: result.err_code_des,
      appId: result.appid,
      mchId: result.mch_id,
      nonceStr: result.nonce_str,
      sign: result.sign,
      prepayId: result.prepay_id,
      tradeType: result.trade_type,
      codeUrl: result.code_url,
      mwebUrl: result.mweb_url
    }
  } catch (error) {
    console.error('微信统一下单失败:', error)
    return {
      returnCode: 'FAIL',
      returnMsg: '网络请求失败'
    }
  }
}

/**
 * 查询订单
 */
export async function orderQuery(
  config: WechatPayConfig,
  outTradeNo: string
): Promise<Record<string, any>> {
  const nonceStr = generateNonceStr()
  
  const requestParams: Record<string, any> = {
    appid: config.appId,
    mch_id: config.mchId,
    out_trade_no: outTradeNo,
    nonce_str: nonceStr
  }

  requestParams.sign = generateSign(requestParams, config.apiKey)
  const xmlData = objectToXml(requestParams)

  try {
    const response = await fetch('https://api.mch.weixin.qq.com/pay/orderquery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      body: xmlData
    })

    const responseText = await response.text()
    return xmlToObject(responseText)
  } catch (error) {
    console.error('查询订单失败:', error)
    return {
      return_code: 'FAIL',
      return_msg: '网络请求失败'
    }
  }
}

/**
 * 关闭订单
 */
export async function closeOrder(
  config: WechatPayConfig,
  outTradeNo: string
): Promise<Record<string, any>> {
  const nonceStr = generateNonceStr()
  
  const requestParams: Record<string, any> = {
    appid: config.appId,
    mch_id: config.mchId,
    out_trade_no: outTradeNo,
    nonce_str: nonceStr
  }

  requestParams.sign = generateSign(requestParams, config.apiKey)
  const xmlData = objectToXml(requestParams)

  try {
    const response = await fetch('https://api.mch.weixin.qq.com/pay/closeorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      body: xmlData
    })

    const responseText = await response.text()
    return xmlToObject(responseText)
  } catch (error) {
    console.error('关闭订单失败:', error)
    return {
      return_code: 'FAIL',
      return_msg: '网络请求失败'
    }
  }
}

/**
 * 申请退款
 */
export async function refund(
  config: WechatPayConfig,
  params: {
    outTradeNo: string      // 商户订单号
    outRefundNo: string     // 商户退款单号
    totalFee: number        // 订单总金额（分）
    refundFee: number       // 退款金额（分）
    refundDesc?: string     // 退款原因
    notifyUrl?: string      // 退款回调地址
  }
): Promise<Record<string, any>> {
  const nonceStr = generateNonceStr()
  
  const requestParams: Record<string, any> = {
    appid: config.appId,
    mch_id: config.mchId,
    nonce_str: nonceStr,
    out_trade_no: params.outTradeNo,
    out_refund_no: params.outRefundNo,
    total_fee: params.totalFee,
    refund_fee: params.refundFee,
    ...(params.refundDesc && { refund_desc: params.refundDesc }),
    ...(params.notifyUrl && { notify_url: params.notifyUrl })
  }

  requestParams.sign = generateSign(requestParams, config.apiKey)
  const xmlData = objectToXml(requestParams)

  try {
    // 注意：退款接口需要双向证书，这里仅作示例
    // 实际使用时需要配置证书
    const response = await fetch('https://api.mch.weixin.qq.com/secapi/pay/refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      body: xmlData
    })

    const responseText = await response.text()
    return xmlToObject(responseText)
  } catch (error) {
    console.error('申请退款失败:', error)
    return {
      return_code: 'FAIL',
      return_msg: '网络请求失败'
    }
  }
}

/**
 * 金额转换：元转分
 */
export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100)
}

/**
 * 金额转换：分转元
 */
export function fenToYuan(fen: number): number {
  return fen / 100
}

/**
 * 生成订单过期时间（默认30分钟）
 */
export function generateExpireTime(minutes: number = 30): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() + minutes)
  return formatTime(now)
}

/**
 * 格式化时间为微信支付要求的格式
 */
export function formatTime(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}${hours}${minutes}${seconds}`
}

/**
 * 生成支付成功响应XML
 */
export function generateSuccessResponse(): string {
  return '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
}

/**
 * 生成支付失败响应XML
 */
export function generateFailResponse(msg: string = 'FAIL'): string {
  return `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[${msg}]]></return_msg></xml>`
}