/**
 * Electron SDK - 主入口
 * 用于 Electron 项目与 Web API 对接
 * 
 * @example
 * ```typescript
 * import { createSdk } from './sdk'
 * 
 * // 创建 SDK 实例
 * const sdk = createSdk({
 *   baseUrl: 'https://your-api.com',
 *   getToken: () => localStorage.getItem('token'),
 *   setToken: (token) => localStorage.setItem('token', token || ''),
 * })
 * 
 * // 登录
 * const loginResult = await sdk.auth.login({
 *   email: 'user@example.com',
 *   password: 'password123'
 * })
 * 
 * // 获取文章列表
 * const posts = await sdk.posts.getList({ page: 1, limit: 10 })
 * 
 * // 创建订单
 * const order = await sdk.shop.createOrder({
 *   productId: 'product_123',
 *   paymentMethod: 'wechat'
 * })
 * ```
 */

import { ApiClient, createApiClient } from './client'
import { AuthModule } from './modules/auth'
import { PostsModule } from './modules/posts'
import { ShopModule } from './modules/shop'
import type { SdkOptions } from './types'

// 导出所有类型
export * from './types'

// 导出客户端
export { ApiClient, createApiClient } from './client'

// 导出模块
export { AuthModule } from './modules/auth'
export { PostsModule } from './modules/posts'
export { ShopModule } from './modules/shop'

/**
 * SDK 主类
 */
export class Sdk {
  /** API 客户端 */
  public client: ApiClient
  
  /** 认证模块 */
  public auth: AuthModule
  
  /** 文章模块 */
  public posts: PostsModule
  
  /** 商店模块 */
  public shop: ShopModule

  constructor(options: SdkOptions) {
    this.client = createApiClient(options)
    this.auth = new AuthModule(this.client)
    this.posts = new PostsModule(this.client)
    this.shop = new ShopModule(this.client)
  }

  /**
   * 更新认证 token
   * @param token 新的 token
   */
  setToken(token: string | null): void {
    this.client.updateToken(token)
  }

  /**
   * 获取当前 token
   */
  getToken(): string | null {
    return this.client.getCurrentToken()
  }
}

/**
 * 创建 SDK 实例
 * @param options SDK 配置选项
 * @returns SDK 实例
 * 
 * @example
 * ```typescript
 * // 基础用法
 * const sdk = createSdk({
 *   baseUrl: 'https://your-api.com'
 * })
 * 
 * // 带认证存储
 * const sdk = createSdk({
 *   baseUrl: 'https://your-api.com',
 *   getToken: () => localStorage.getItem('auth_token'),
 *   setToken: (token) => {
 *     if (token) {
 *       localStorage.setItem('auth_token', token)
 *     } else {
 *       localStorage.removeItem('auth_token')
 *     }
 *   },
 *   debug: true // 开启调试模式
 * })
 * ```
 */
export function createSdk(options: SdkOptions): Sdk {
  return new Sdk(options)
}

// 默认导出
export default Sdk
