"use client"

import { useSyncExternalStore, useEffect } from "react"

// 用户类型定义
export interface User {
  id: string
  name: string
  email: string
  avatar: string | null
  bio: string | null
  isAdmin: boolean
}

// 认证状态
interface AuthState {
  user: User | null
  isLoggedIn: boolean
  isLoading: boolean
}

// 初始状态
let state: AuthState = {
  user: null,
  isLoggedIn: false,
  isLoading: true, // 初始加载状态
}

// 是否已初始化
let isInitialized = false

// 初始化 Promise，用于防止重复初始化
let initPromise: Promise<void> | null = null

// 监听器集合
const listeners = new Set<() => void>()

// 触发状态更新
function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

// 订阅函数
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// 获取快照
function getSnapshot() {
  return state
}

// 服务端默认状态（稳定的对象引用）
const EMPTY_AUTH_STATE = {
  user: null,
  isLoggedIn: false,
  isLoading: true,
}

// 获取服务端快照（用于 SSR）
function getServerSnapshot() {
  return EMPTY_AUTH_STATE
}

/**
 * 从服务器获取当前用户信息
 */
async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include', // 包含 cookie
      cache: 'no-store', // 不缓存
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    if (data.success && data.data) {
      return {
        id: data.data.id,
        name: data.data.name,
        email: data.data.email,
        avatar: data.data.avatar,
        bio: data.data.bio,
        isAdmin: data.data.isAdmin,
      }
    }
    return null
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

/**
 * 初始化认证状态（从服务器恢复登录状态）
 */
export async function initAuth(): Promise<void> {
  // 如果已经初始化完成，直接返回
  if (isInitialized) {
    return
  }

  // 如果正在初始化，等待完成
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    try {
      const user = await fetchCurrentUser()
      state = {
        user,
        isLoggedIn: !!user,
        isLoading: false,
      }
      isInitialized = true
    } catch (error) {
      console.error('初始化认证状态失败:', error)
      state = {
        user: null,
        isLoggedIn: false,
        isLoading: false,
      }
    }
    emitChange()
  })()

  return initPromise
}

/**
 * 登录函数 - 调用真实 API
 */
export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    state = { ...state, isLoading: true }
    emitChange()

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      state = { user: null, isLoggedIn: false, isLoading: false }
      emitChange()
      return { success: false, error: data.error || '登录失败' }
    }

    // 更新状态
    state = {
      user: {
        id: data.data.user.id,
        name: data.data.user.name,
        email: data.data.user.email,
        avatar: data.data.user.avatar || null,
        bio: data.data.user.bio || null,
        isAdmin: data.data.user.isAdmin,
      },
      isLoggedIn: true,
      isLoading: false,
    }
    isInitialized = true
    emitChange()

    return { success: true }
  } catch (error) {
    console.error('登录失败:', error)
    state = { user: null, isLoggedIn: false, isLoading: false }
    emitChange()
    return { success: false, error: '网络错误，请稍后重试' }
  }
}

/**
 * 注册函数 - 调用真实 API
 */
export async function register(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    state = { ...state, isLoading: true }
    emitChange()

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password, name }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      state = { user: null, isLoggedIn: false, isLoading: false }
      emitChange()
      return { success: false, error: data.error || '注册失败' }
    }

    // 注册成功后自动登录
    state = {
      user: {
        id: data.data.user.id,
        name: data.data.user.name,
        email: data.data.user.email,
        avatar: data.data.user.avatar || null,
        bio: data.data.user.bio || null,
        isAdmin: data.data.user.isAdmin,
      },
      isLoggedIn: true,
      isLoading: false,
    }
    isInitialized = true
    emitChange()

    return { success: true }
  } catch (error) {
    console.error('注册失败:', error)
    state = { user: null, isLoggedIn: false, isLoading: false }
    emitChange()
    return { success: false, error: '网络错误，请稍后重试' }
  }
}

/**
 * 登出函数 - 调用真实 API
 */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } catch (error) {
    console.error('登出失败:', error)
  } finally {
    // 无论 API 是否成功，都清除本地状态
    state = { user: null, isLoggedIn: false, isLoading: false }
    isInitialized = false
    initPromise = null
    emitChange()
  }
}

/**
 * 更新用户资料
 */
export async function updateProfile(updates: Partial<User>) {
  if (!state.user) return

  // 保存旧值用于回滚
  const oldUser = { ...state.user }

  // 先更新本地状态
  state = {
    ...state,
    user: { ...state.user, ...updates },
  }
  emitChange()

  // 调用 API 保存到数据库
  try {
    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    })

    const data = await response.json()
    
    if (!response.ok || !data.success) {
      console.error('保存用户资料失败:', data.error)
      // 回滚本地状态
      state = {
        ...state,
        user: oldUser,
      }
      emitChange()
      throw new Error(data.error || '保存失败')
    }
  } catch (error) {
    console.error('更新用户资料失败:', error)
    // 回滚本地状态
    state = {
      ...state,
      user: oldUser,
    }
    emitChange()
    throw error
  }
}

/**
 * 使用认证状态的 Hook
 */
export function useAuth() {
  const authState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  
  // 组件挂载时初始化认证状态
  useEffect(() => {
    if (!isInitialized) {
      initAuth()
    }
  }, [])

  return authState
}

/**
 * 检查是否已登录（用于路由保护）
 */
export function checkAuth(): boolean {
  return state.isLoggedIn
}

/**
 * 获取当前用户（同步方法）
 */
export function getCurrentUser(): User | null {
  return state.user
}
