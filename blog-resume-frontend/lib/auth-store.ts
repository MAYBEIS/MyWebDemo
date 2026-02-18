"use client"

import { useSyncExternalStore, useCallback } from "react"

export interface User {
  id: string
  username: string
  email: string
  avatar: string
  bio: string
  joinDate: string
  role: "admin" | "user"
  stats: {
    posts: number
    comments: number
    likes: number
  }
}

interface AuthState {
  user: User | null
  isLoggedIn: boolean
}

let state: AuthState = {
  user: null,
  isLoggedIn: false,
}

const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

export function login(username: string, _email: string) {
  const initials = username
    .split(/[_\s]/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  state = {
    user: {
      id: `user_${Date.now()}`,
      username,
      email: _email,
      avatar: initials,
      bio: "系统编程爱好者",
      joinDate: new Date().toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      role: "user",
      stats: { posts: 0, comments: 0, likes: 0 },
    },
    isLoggedIn: true,
  }
  emitChange()
}

export function loginAsAdmin() {
  state = {
    user: {
      id: "admin_001",
      username: "SysLog",
      email: "admin@syslog.dev",
      avatar: "SL",
      bio: "系统程序员 & 技术作者 | 探索内核、编译器与高性能计算的深度奥秘",
      joinDate: "2024年1月1日",
      role: "admin",
      stats: { posts: 12, comments: 47, likes: 256 },
    },
    isLoggedIn: true,
  }
  emitChange()
}

export function logout() {
  state = { user: null, isLoggedIn: false }
  emitChange()
}

export function updateProfile(updates: Partial<User>) {
  if (!state.user) return
  state = {
    ...state,
    user: { ...state.user, ...updates },
  }
  emitChange()
}

export function incrementStat(key: keyof User["stats"]) {
  if (!state.user) return
  state = {
    ...state,
    user: {
      ...state.user,
      stats: { ...state.user.stats, [key]: state.user.stats[key] + 1 },
    },
  }
  emitChange()
}

export function useAuth() {
  const authState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return authState
}
