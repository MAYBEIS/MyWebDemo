/**
 * 留言板服务层
 * 处理留言的 CRUD 操作
 * 使用 Prisma 连接数据库
 */

import prisma from './prisma'

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
  const total = await prisma.guestbook.count()

  // 获取分页数据
  const entries = await prisma.guestbook.findMany({
    include: {
      author: {
        select: { name: true, avatar: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  // 转换为 GuestbookEntry 格式
  const formattedEntries: GuestbookEntry[] = entries.map((entry) => ({
    id: entry.id,
    message: entry.message,
    authorId: entry.authorId,
    authorName: entry.author.name,
    authorAvatar: entry.author.avatar,
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
  const entry = await prisma.guestbook.findUnique({
    where: { id },
    include: {
      author: {
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
    authorName: entry.author.name,
    authorAvatar: entry.author.avatar,
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
  const entry = await prisma.guestbook.create({
    data: {
      message: input.message,
      authorId: input.authorId,
    },
    include: {
      author: {
        select: { name: true, avatar: true }
      }
    },
  })

  return {
    id: entry.id,
    message: entry.message,
    authorId: entry.authorId,
    authorName: entry.author.name,
    authorAvatar: entry.author.avatar,
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
  const existingEntry = await prisma.guestbook.findUnique({
    where: { id },
  })

  if (!existingEntry || existingEntry.authorId !== authorId) {
    return null
  }

  const entry = await prisma.guestbook.update({
    where: { id },
    data: {
      message: input.message,
      updatedAt: new Date(),
    },
    include: {
      author: {
        select: { name: true, avatar: true }
      }
    },
  })

  return {
    id: entry.id,
    message: entry.message,
    authorId: entry.authorId,
    authorName: entry.author.name,
    authorAvatar: entry.author.avatar,
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
  const existingEntry = await prisma.guestbook.findUnique({
    where: { id },
  })

  if (!existingEntry) {
    return false
  }

  if (!isAdmin && existingEntry.authorId !== authorId) {
    return false
  }

  try {
    await prisma.guestbook.delete({
      where: { id },
    })
    return true
  } catch {
    return false
  }
}
