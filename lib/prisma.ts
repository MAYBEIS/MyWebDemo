/**
 * Prisma 客户端实例
 * 使用单例模式避免开发环境热重载时创建多个连接
 * 支持 Vercel Postgres 和其他 PostgreSQL 数据库
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 创建 Prisma 客户端实例
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  })
}

// 在开发环境中复用 Prisma 客户端实例
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
