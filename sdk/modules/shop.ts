/**
 * Electron SDK - 商店模块
 * 处理产品列表、订单创建、支付等功能
 */

import type { ApiClient } from '../client'
import type {
  ApiResponse,
  Product,
  GetProductsParams,
  Order,
  OrderStatus,
  CreateOrderParams,
  GetOrdersParams,
  Coupon,
  ValidateCouponParams,
} from '../types'

/**
 * 支付渠道信息
 */
export interface PaymentChannel {
  id: string
  name: string
  code: string
  icon?: string
  description?: string
  status: boolean
}

/**
 * 支付响应
 */
export interface PaymentResponse {
  orderId: string
  orderNo: string
  paymentUrl?: string
  qrCode?: string
  amount: number
  status: OrderStatus
}

/**
 * 订单详情（包含产品和密钥信息）
 */
export interface OrderDetail extends Order {
  productKey?: string
  productKeys?: Array<{
    id: string
    key: string
    status: string
    expiresAt?: string
  }>
}

/**
 * 商店模块
 */
export class ShopModule {
  private client: ApiClient

  constructor(client: ApiClient) {
    this.client = client
  }

  // ==================== 产品相关 ====================

  /**
   * 获取产品列表
   * @param params 查询参数
   * @returns 产品列表
   * 
   * @example
   * ```typescript
   * // 获取所有上架产品
   * const result = await sdk.shop.getProducts()
   * 
   * // 按类型筛选
   * const memberships = await sdk.shop.getProducts({ type: 'membership' })
   * ```
   */
  async getProducts(params?: GetProductsParams): Promise<ApiResponse<Product[]>> {
    return this.client.get<Product[]>('/api/shop/products', params as Record<string, string | undefined>)
  }

  /**
   * 获取单个产品详情
   * @param productId 产品 ID
   * @returns 产品详情
   */
  async getProduct(productId: string): Promise<ApiResponse<Product>> {
    const result = await this.getProducts()
    if (!result.success || !result.data) {
      return { success: false, error: result.error || '获取产品失败' }
    }
    const product = result.data.find(p => p.id === productId)
    if (!product) {
      return { success: false, error: '产品不存在' }
    }
    return { success: true, data: product }
  }

  // ==================== 订单相关 ====================

  /**
   * 获取订单列表
   * @param params 查询参数
   * @returns 订单列表
   * 
   * @example
   * ```typescript
   * // 获取当前用户的所有订单
   * const result = await sdk.shop.getOrders()
   * 
   * // 获取待支付的订单
   * const pendingOrders = await sdk.shop.getOrders({ status: 'pending' })
   * ```
   */
  async getOrders(params?: GetOrdersParams): Promise<ApiResponse<Order[]>> {
    return this.client.get<Order[]>('/api/shop/orders', params as Record<string, string | undefined>)
  }

  /**
   * 获取订单详情
   * @param orderId 订单 ID
   * @returns 订单详情
   */
  async getOrder(orderId: string): Promise<ApiResponse<OrderDetail>> {
    const result = await this.getOrders()
    if (!result.success || !result.data) {
      return { success: false, error: result.error || '获取订单失败' }
    }
    const order = result.data.find(o => o.id === orderId)
    if (!order) {
      return { success: false, error: '订单不存在' }
    }
    return { success: true, data: order as OrderDetail }
  }

  /**
   * 创建订单
   * @param params 订单参数
   * @returns 创建的订单
   * 
   * @example
   * ```typescript
   * const result = await sdk.shop.createOrder({
   *   productId: 'product_123',
   *   paymentMethod: 'wechat',
   *   couponCode: 'DISCOUNT10' // 可选
   * })
   * if (result.success) {
   *   console.log('订单创建成功:', result.data)
   * }
   * ```
   */
  async createOrder(params: CreateOrderParams): Promise<ApiResponse<Order>> {
    return this.client.post<Order>('/api/shop/orders', params)
  }

  /**
   * 取消订单
   * @param orderId 订单 ID
   * @returns 取消结果
   * 
   * @example
   * ```typescript
   * const result = await sdk.shop.cancelOrder('order_123')
   * if (result.success) {
   *   console.log('订单已取消')
   * }
   * ```
   */
  async cancelOrder(orderId: string): Promise<ApiResponse<Order>> {
    return this.client.delete<Order>('/api/shop/orders', { id: orderId })
  }

  // ==================== 支付相关 ====================

  /**
   * 获取支付渠道列表
   * @returns 支付渠道列表
   * 
   * @example
   * ```typescript
   * const result = await sdk.shop.getPaymentChannels()
   * if (result.success) {
   *   result.data.forEach(channel => {
   *     console.log(`${channel.name}: ${channel.code}`)
   *   })
   * }
   * ```
   */
  async getPaymentChannels(): Promise<ApiResponse<PaymentChannel[]>> {
    return this.client.get<PaymentChannel[]>('/api/shop/payment-channels')
  }

  /**
   * 发起支付
   * @param orderId 订单 ID
   * @param paymentMethod 支付方式
   * @returns 支付信息（包含支付链接或二维码）
   * 
   * @example
   * ```typescript
   * // 微信支付
   * const result = await sdk.shop.pay('order_123', 'wechat')
   * if (result.success) {
   *   // 打开支付链接或显示二维码
   *   if (result.data.paymentUrl) {
   *     window.open(result.data.paymentUrl)
   *   }
   *   if (result.data.qrCode) {
   *     // 显示二维码
   *   }
   * }
   * ```
   */
  async pay(orderId: string, paymentMethod: string): Promise<ApiResponse<PaymentResponse>> {
    // 根据支付方式调用不同的支付接口
    const payPath = `/api/shop/${paymentMethod}`
    
    // 先获取订单信息
    const orderResult = await this.getOrder(orderId)
    if (!orderResult.success || !orderResult.data) {
      return { success: false, error: orderResult.error || '订单不存在' }
    }

    const order = orderResult.data

    // 调用支付接口
    const result = await this.client.post<PaymentResponse>(payPath, {
      orderId,
      amount: order.amount,
    })

    return result
  }

  /**
   * 查询支付状态
   * @param orderId 订单 ID
   * @returns 订单状态
   * 
   * @example
   * ```typescript
   * const result = await sdk.shop.queryPaymentStatus('order_123')
   * if (result.success) {
   *   if (result.data.status === 'paid') {
   *     console.log('支付成功！')
   *     console.log('激活码:', result.data.productKey)
   *   }
   * }
   * ```
   */
  async queryPaymentStatus(orderId: string): Promise<ApiResponse<OrderDetail>> {
    return this.getOrder(orderId)
  }

  /**
   * 轮询支付状态直到完成
   * @param orderId 订单 ID
   * @param timeout 超时时间（毫秒）
   * @param interval 轮询间隔（毫秒）
   * @returns 最终订单状态
   * 
   * @example
   * ```typescript
   * // 发起支付后轮询
   * const result = await sdk.shop.pollPaymentStatus('order_123', 5 * 60 * 1000)
   * if (result.success && result.data.status === 'paid') {
   *   console.log('支付成功！')
   * }
   * ```
   */
  async pollPaymentStatus(
    orderId: string,
    timeout: number = 5 * 60 * 1000,
    interval: number = 3000
  ): Promise<ApiResponse<OrderDetail>> {
    const startTime = Date.now()

    return new Promise((resolve) => {
      const poll = async () => {
        const result = await this.queryPaymentStatus(orderId)
        
        if (!result.success) {
          resolve(result)
          return
        }

        const order = result.data!
        
        // 支付成功或已取消，停止轮询
        if (order.status === 'paid' || order.status === 'completed' || order.status === 'cancelled') {
          resolve(result)
          return
        }

        // 超时
        if (Date.now() - startTime >= timeout) {
          resolve({
            success: false,
            error: '支付超时',
          })
          return
        }

        // 继续轮询
        setTimeout(poll, interval)
      }

      poll()
    })
  }

  // ==================== 优惠券相关 ====================

  /**
   * 验证优惠券
   * @param code 优惠券代码
   * @param amount 订单金额
   * @returns 优惠券信息
   * 
   * @example
   * ```typescript
   * const result = await sdk.shop.validateCoupon('DISCOUNT10', 100)
   * if (result.success) {
   *   console.log('优惠券有效:', result.data)
   * }
   * ```
   */
  async validateCoupon(code: string, amount: number): Promise<ApiResponse<Coupon>> {
    return this.client.post<Coupon>('/api/shop/coupons/validate', { code, amount })
  }

  // ==================== 会员相关 ====================

  /**
   * 获取用户会员信息
   * @returns 会员信息
   * 
   * @example
   * ```typescript
   * const result = await sdk.shop.getMembership()
   * if (result.success) {
   *   console.log('会员到期时间:', result.data.endDate)
   * }
   * ```
   */
  async getMembership(): Promise<ApiResponse<{
    type: string
    startDate: string
    endDate: string
    active: boolean
  } | null>> {
    return this.client.get('/api/shop/membership')
  }

  /**
   * 获取用户购买的产品密钥
   * @returns 密钥列表
   * 
   * @example
   * ```typescript
   * const result = await sdk.shop.getMyKeys()
   * if (result.success) {
   *   result.data.forEach(key => {
   *     console.log(`${key.productName}: ${key.key}`)
   *   })
   * }
   * ```
   */
  async getMyKeys(): Promise<ApiResponse<Array<{
    id: string
    key: string
    status: string
    expiresAt?: string
    productId: string
    productName: string
  }>>> {
    return this.client.get('/api/shop/keys')
  }
}
