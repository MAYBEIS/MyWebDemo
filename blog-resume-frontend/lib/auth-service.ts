/**
 * 认证服务层
 * 处理用户认证、JWT 生成和验证
 * 使用 Prisma + bcrypt 实现生产级安全
 */

import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import prisma from './prisma'

// 用户类型定义（不含密码）
export interface AuthUser {
  id: string
  email: string
  name: string
  isAdmin: boolean
  avatar?: string | null
  bio?: string | null
}

// JWT 密钥（从环境变量读取）
function getJWTSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET 环境变量未设置')
  }
  return new TextEncoder().encode(secret)
}

// 密码哈希配置
const SALT_ROUNDS = 12

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * 验证用户凭据
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const user = await prisma.users.findUnique({
    where: { email },
  })

  if (!user) {
    return null
  }

  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    return null
  }

  // 返回不包含密码的用户信息
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    avatar: user.avatar,
    bio: user.bio,
  }
}

/**
 * 生成 JWT token
 */
export async function generateToken(user: AuthUser): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJWTSecret())

  return token
}

/**
 * 验证 JWT token
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret())

    // 从数据库验证用户是否仍然有效
    const user = await prisma.users.findUnique({
      where: { id: payload.userId as string },
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      avatar: user.avatar,
      bio: user.bio,
    }
  } catch (error) {
    console.error('Token 验证失败:', error)
    return null
  }
}

/**
 * 从请求中获取当前用户
 */
export async function getCurrentUser(
  request: Request
): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 尝试从 Cookie 获取 token
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/)
      if (tokenMatch) {
        return verifyToken(tokenMatch[1])
      }
    }
    return null
  }

  const token = authHeader.substring(7)
  return verifyToken(token)
}

/**
 * 检查用户是否为管理员
 */
export async function isAdmin(request: Request): Promise<boolean> {
  const user = await getCurrentUser(request)
  return user?.isAdmin || false
}

/**
 * 注册新用户
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<AuthUser | null> {
  // 检查邮箱是否已存在
  const existingUser = await prisma.users.findUnique({
    where: { email },
  })

  if (existingUser) {
    return null
  }

  // 哈希密码
  const hashedPassword = await hashPassword(password)

  // 生成头像首字母
  const initials = name
    .split(/[_\s]/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const user = await prisma.users.create({
    data: {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      password: hashedPassword,
      avatar: initials,
      bio: '',
      isAdmin: false,
      updatedAt: new Date(),
    },
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    avatar: user.avatar,
    bio: user.bio,
  }
}

/**
 * 更新用户资料
 */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; bio?: string; avatar?: string }
): Promise<AuthUser | null> {
  const user = await prisma.users.update({
    where: { id: userId },
    data: { ...data, updatedAt: new Date() },
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    avatar: user.avatar,
    bio: user.bio,
  }
}

/**
 * 修改密码
 */
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return false
  }

  // 验证旧密码
  const isValid = await verifyPassword(oldPassword, user.password)
  if (!isValid) {
    return false
  }

  // 哈希新密码
  const hashedPassword = await hashPassword(newPassword)

  // 更新密码
  await prisma.users.update({
    where: { id: userId },
    data: { password: hashedPassword, updatedAt: new Date() },
  })

  return true
}
