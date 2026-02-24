/**
 * Electron SDK - 认证模块
 * 处理用户登录、注册、登出等功能
 */

import type { ApiClient } from '../client'
import type {
  ApiResponse,
  User,
  LoginParams,
  LoginResponse,
  RegisterParams,
  RegisterResponse,
} from '../types'

/**
 * 认证模块
 */
export class AuthModule {
  private client: ApiClient

  constructor(client: ApiClient) {
    this.client = client
  }

  /**
   * 用户登录
   * @param params 登录参数（邮箱和密码）
   * @returns 登录响应，包含用户信息和 token
   * 
   * @example
   * ```typescript
   * const result = await sdk.auth.login({
   *   email: 'user@example.com',
   *   password: 'password123'
   * })
   * if (result.success) {
   *   console.log('登录成功:', result.data.user)
   *   console.log('Token:', result.data.token)
   * }
   * ```
   */
  async login(params: LoginParams): Promise<ApiResponse<LoginResponse>> {
    const response = await this.client.post<LoginResponse>('/api/auth/login', params)
    
    // 登录成功后自动保存 token
    if (response.success && response.data?.token) {
      this.client.updateToken(response.data.token)
    }
    
    return response
  }

  /**
   * 用户注册
   * @param params 注册参数（邮箱、密码、用户名）
   * @returns 注册响应，包含用户信息和 token
   * 
   * @example
   * ```typescript
   * const result = await sdk.auth.register({
   *   email: 'user@example.com',
   *   password: 'password123',
   *   name: '用户名'
   * })
   * if (result.success) {
   *   console.log('注册成功:', result.data.user)
   * }
   * ```
   */
  async register(params: RegisterParams): Promise<ApiResponse<RegisterResponse>> {
    const response = await this.client.post<RegisterResponse>('/api/auth/register', params)
    
    // 注册成功后自动保存 token
    if (response.success && response.data?.token) {
      this.client.updateToken(response.data.token)
    }
    
    return response
  }

  /**
   * 用户登出
   * @returns 登出结果
   * 
   * @example
   * ```typescript
   * await sdk.auth.logout()
   * ```
   */
  async logout(): Promise<ApiResponse<null>> {
    const response = await this.client.post<null>('/api/auth/logout')
    
    // 登出后清除 token
    this.client.updateToken(null)
    
    return response
  }

  /**
   * 获取当前登录用户信息
   * @returns 用户信息
   * 
   * @example
   * ```typescript
   * const result = await sdk.auth.getCurrentUser()
   * if (result.success) {
   *   console.log('当前用户:', result.data)
   * } else {
   *   console.log('未登录')
   * }
   * ```
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.client.get<User>('/api/auth/me')
  }

  /**
   * 检查用户是否已登录
   * @returns 是否已登录
   * 
   * @example
   * ```typescript
   * const isLoggedIn = await sdk.auth.isLoggedIn()
   * console.log('是否已登录:', isLoggedIn)
   * ```
   */
  async isLoggedIn(): Promise<boolean> {
    const result = await this.getCurrentUser()
    return result.success
  }

  /**
   * 更新用户资料
   * @param data 要更新的资料
   * @returns 更新后的用户信息
   * 
   * @example
   * ```typescript
   * const result = await sdk.auth.updateProfile({
   *   name: '新用户名',
   *   bio: '个人简介'
   * })
   * ```
   */
  async updateProfile(data: { name?: string; bio?: string; avatar?: string }): Promise<ApiResponse<User>> {
    return this.client.post<User>('/api/auth/profile', data)
  }

  /**
   * 修改密码
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   * @returns 修改结果
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    return this.client.post<null>('/api/auth/profile', {
      oldPassword,
      newPassword,
    })
  }

  /**
   * 上传头像
   * @param file 头像文件
   * @returns 头像 URL
   */
  async uploadAvatar(file: File): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData()
    formData.append('file', file)

    // 使用 fetch 直接发送 FormData
    const token = this.client.getCurrentToken()
    const response = await fetch(`${this.client['baseUrl']}/api/auth/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      credentials: 'include',
    })

    return response.json()
  }
}
