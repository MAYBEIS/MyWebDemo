/**
 * 留言板服务层
 * 处理留言的 CRUD 操作
 * 使用 Prisma 连接数据库
 */

import prisma from './prisma'

// 留言查询结果类型（包含作者信息）
interface GuestbookWithAuthor {
  id: string
  message: string
  authorId: string
  createdAt: Date
  updatedAt: Date
  users: {
    name: string
    avatar: string | null
  }
}

// 留言类型定义
export interface GuestbookEntry {
  id: string
  message: string
  authorId: string
  authorName?: string
  authorAvatar?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateGuestbookInput {
  message: string
  authorId: string
}

export interface UpdateGuestbookInput {
  message: string
}

export interface GetGuestbookOptions {
  page?: number
  limit?: number
}

/**
 * 获取留言列表
 */
export async function getGuestbookEntries(
  options: GetGuestbookOptions = {}
): Promise<{
  entries: GuestbookEntry[]
  total: number
  page: number
  limit: number
}> {
  const { page = 1, limit = 20 } = options

  // 获取总数
  const total = await prisma.guestbooks.count()

  // 获取分页数据
  const entries = await prisma.guestbooks.findMany({
    include: {
      users: {
        select: { name: true, avatar: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  // 转换为 GuestbookEntry 格式
  const formattedEntries: GuestbookEntry[] = entries.map((entry: GuestbookWithAuthor) => ({
    id: entry.id,
    message: entry.message,
    authorId: entry.authorId,
    authorName: entry.users.name,
    authorAvatar: entry.users.avatar,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }))

  return {
    entries: formattedEntries,
    total,
    page,
    limit,
  }
}

/**
 * 根据 ID 获取单条留言
 */
export async function getGuestbookEntryById(
  id: string
): Promise<GuestbookEntry | null> {
  const entry = await prisma.guestbooks.findUnique({
    where: { id },
    include: {
      users: {
        select: { name: true, avatar: true }
      }
    },
  })

  if (!entry) {
    return null
  }

  return {
    id: entry.id,
    message: entry.message,
    authorId: entry.authorId,
    authorName: entry.users.name,
    authorAvatar: entry.users.avatar,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }
}

/**
 * 创建新留言
 */
export async function createGuestbookEntry(
  input: CreateGuestbookInput
): Promise<GuestbookEntry> {
  const id = `guestbook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const entry = await prisma.guestbooks.create({
    data: {
      id,
      message: input.message,
      authorId: input.authorId,
      updatedAt: new Date(),
    },
    include: {
      users: {
        select: { name: true, avatar: true }
      }
    },
  })

  return {
    id: entry.id,
    message: entry.message,
    authorId: entry.authorId,
    authorName: entry.users.name,
    authorAvatar: entry.users.avatar,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }
}

/**
 * 更新留言
 */
export async function updateGuestbookEntry(
  id: string,
  authorId: string,
  input: UpdateGuestbookInput
): Promise<GuestbookEntry | null> {
  // 验证留言是否属于该用户
  const existingEntry = await prisma.guestbooks.findUnique({
    where: { id },
  })

  if (!existingEntry || existingEntry.authorId !== authorId) {
    return null
  }

  const entry = await prisma.guestbooks.update({
    where: { id },
    data: {
      message: input.message,
      updatedAt: new Date(),
    },
    include: {
      users: {
        select: { name: true, avatar: true }
      }
    },
  })

  return {
    id: entry.id,
    message: entry.message,
    authorId: entry.authorId,
    authorName: entry.users.name,
    authorAvatar: entry.users.avatar,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }
}

/**
 * 删除留言
 */
export async function deleteGuestbookEntry(
  id: string,
  authorId: string,
  isAdmin: boolean = false
): Promise<boolean> {
  // 验证留言是否属于该用户或用户是管理员
  const existingEntry = await prisma.guestbooks.findUnique({
    where: { id },
  })

  if (!existingEntry) {
    return false
  }

  if (!isAdmin && existingEntry.authorId !== authorId) {
    return false
  }

  try {
    await prisma.guestbooks.delete({
      where: { id },
    })
    return true
  } catch {
    return false
  }
}
