/**
 * Electron SDK - API 客户端
 * 用于 Electron 项目与 Web API 对接
 */

import type {
  ApiResponse,
  SdkConfig,
  SdkOptions,
} from './types'

/**
 * API 客户端类
 * 处理所有 HTTP 请求
 */
export class ApiClient {
  private baseUrl: string
  private timeout: number
  private getToken: () => string | null
  private setToken: (token: string | null) => void
  private debug: boolean

  constructor(options: SdkOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '') // 移除末尾斜杠
    this.timeout = options.timeout || 30000
    this.getToken = options.getToken || (() => null)
    this.setToken = options.setToken || (() => {})
    this.debug = options.debug || false
  }

  /**
   * 发送 HTTP 请求
   * @param method HTTP 方法
   * @param path API 路径
   * @param data 请求数据
   * @param params URL 查询参数
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    data?: unknown,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<ApiResponse<T>> {
    // 构建 URL
    let url = `${this.baseUrl}${path}`
    
    // 添加查询参数
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    // 构建请求选项
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // 添加认证 token
    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const options: RequestInit = {
      method,
      headers,
      credentials: 'include', // 包含 cookies
    }

    // 添加请求体
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data)
    }

    // 调试日志
    if (this.debug) {
      console.log(`[SDK] ${method} ${url}`, { data, params })
    }

    try {
      // 创建 AbortController 用于超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)
      options.signal = controller.signal

      const response = await fetch(url, options)
      clearTimeout(timeoutId)

      const result = await response.json() as ApiResponse<T>

      if (this.debug) {
        console.log(`[SDK] Response:`, result)
      }

      return result
    } catch (error) {
      if (this.debug) {
        console.error(`[SDK] Error:`, error)
      }

      // 处理超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: '请求超时，请检查网络连接',
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
      }
    }
  }

  /**
   * GET 请求
   */
  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, params)
  }

  /**
   * POST 请求
   */
  async post<T>(
    path: string,
    data?: unknown,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, data, params)
  }

  /**
   * PUT 请求
   */
  async put<T>(
    path: string,
    data?: unknown,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, data, params)
  }

  /**
   * DELETE 请求
   */
  async delete<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, params)
  }

  /**
   * PATCH 请求
   */
  async patch<T>(
    path: string,
    data?: unknown,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, data, params)
  }

  /**
   * 更新认证 token
   */
  updateToken(token: string | null): void {
    this.setToken(token)
  }

  /**
   * 获取当前 token
   */
  getCurrentToken(): string | null {
    return this.getToken()
  }
}

/**
 * 创建 API 客户端实例
 */
export function createApiClient(options: SdkOptions): ApiClient {
  return new ApiClient(options)
}
