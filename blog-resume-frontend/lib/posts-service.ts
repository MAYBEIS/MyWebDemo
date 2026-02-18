/**
 * 博客文章服务层
 * 处理文章的 CRUD 操作
 * 使用 Prisma 连接数据库
 */

import prisma from './prisma'

// 文章类型定义
export interface Post {
  id: string
  slug: string
  title: string
  content: string
  excerpt?: string | null
  category?: string | null
  tags?: string[]
  coverImage?: string | null
  authorId: string
  authorName?: string
  createdAt: Date
  updatedAt: Date
  published: boolean
  views: number
  likes: number
}

export interface CreatePostInput {
  title: string
  content: string
  excerpt?: string
  category?: string
  tags?: string[]
  coverImage?: string
  authorId: string
}

export interface UpdatePostInput {
  title?: string
  content?: string
  excerpt?: string
  category?: string
  tags?: string[]
  coverImage?: string
  published?: boolean
}

export interface GetPostsOptions {
  page?: number
  limit?: number
  category?: string
  tag?: string
  search?: string
}

/**
 * 获取文章列表
 */
export async function getPosts(options: GetPostsOptions = {}): Promise<{
  posts: Post[]
  total: number
  page: number
  limit: number
}> {
  const {
    page = 1,
    limit = 10,
    category,
    tag,
    search,
  } = options

  // 构建查询条件
  const where: any = {
    published: true,
  }

  // 按分类筛选
  if (category) {
    where.category = category
  }

  // 按标签筛选
  if (tag) {
    where.tags = {
      some: { tag }
    }
  }

  // 搜索筛选
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { excerpt: { contains: search } },
      { content: { contains: search } },
    ]
  }

  // 获取总数
  const total = await prisma.post.count({ where })

  // 获取分页数据
  const posts = await prisma.post.findMany({
    where,
    include: {
      author: {
        select: { name: true }
      },
      tags: true,
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  // 转换为 Post 格式
  const formattedPosts: Post[] = posts.map(post => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags.map(t => t.tag),
    coverImage: post.coverImage,
    authorId: post.authorId,
    authorName: post.author.name,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    published: post.published,
    views: post.views,
    likes: post.likes,
  }))

  return {
    posts: formattedPosts,
    total,
    page,
    limit,
  }
}

/**
 * 根据 slug 获取单篇文章
 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: {
        select: { name: true }
      },
      tags: true,
    },
  })

  if (!post) {
    return null
  }

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags.map(t => t.tag),
    coverImage: post.coverImage,
    authorId: post.authorId,
    authorName: post.author.name,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    published: post.published,
    views: post.views,
    likes: post.likes,
  }
}

/**
 * 创建新文章
 */
export async function createPost(input: CreatePostInput): Promise<Post> {
  const slug = generateSlug(input.title)
  const excerpt = input.excerpt || generateExcerpt(input.content)

  const post = await prisma.post.create({
    data: {
      slug,
      title: input.title,
      content: input.content,
      excerpt,
      category: input.category,
      coverImage: input.coverImage,
      authorId: input.authorId,
      published: true,
      tags: input.tags ? {
        create: input.tags.map(tag => ({ tag }))
      } : undefined,
    },
    include: {
      author: { select: { name: true } },
      tags: true,
    },
  })

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags.map(t => t.tag),
    coverImage: post.coverImage,
    authorId: post.authorId,
    authorName: post.author.name,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    published: post.published,
    views: post.views,
    likes: post.likes,
  }
}

/**
 * 更新文章
 */
export async function updatePost(
  slug: string,
  input: UpdatePostInput
): Promise<Post | null> {
  // 先查找文章
  const existingPost = await prisma.post.findUnique({
    where: { slug },
  })

  if (!existingPost) {
    return null
  }

  // 如果标题改变，更新 slug
  const newSlug = input.title ? generateSlug(input.title) : slug

  // 更新文章
  const post = await prisma.post.update({
    where: { slug },
    data: {
      ...input,
      slug: newSlug,
      updatedAt: new Date(),
      // 更新标签
      ...(input.tags && {
        tags: {
          deleteMany: {},
          create: input.tags.map(tag => ({ tag })),
        },
      }),
    },
    include: {
      author: { select: { name: true } },
      tags: true,
    },
  })

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags.map(t => t.tag),
    coverImage: post.coverImage,
    authorId: post.authorId,
    authorName: post.author.name,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    published: post.published,
    views: post.views,
    likes: post.likes,
  }
}

/**
 * 删除文章
 */
export async function deletePost(slug: string): Promise<boolean> {
  try {
    await prisma.post.delete({
      where: { slug },
    })
    return true
  } catch (error) {
    return false
  }
}

/**
 * 增加文章浏览量
 */
export async function incrementViews(slug: string): Promise<void> {
  await prisma.post.update({
    where: { slug },
    data: { views: { increment: 1 } },
  })
}

/**
 * 增加文章点赞数
 */
export async function incrementLikes(slug: string): Promise<void> {
  await prisma.post.update({
    where: { slug },
    data: { likes: { increment: 1 } },
  })
}

/**
 * 获取所有分类
 */
export async function getCategories(): Promise<string[]> {
  const categories = await prisma.post.findMany({
    where: { published: true },
    select: { category: true },
    distinct: ['category'],
  })
  return categories
    .map(c => c.category)
    .filter((c): c is string => c !== null)
}

/**
 * 获取所有标签
 */
export async function getTags(): Promise<string[]> {
  const tags = await prisma.postTag.findMany({
    distinct: ['tag'],
    select: { tag: true },
  })
  return tags.map(t => t.tag)
}

/**
 * 生成 URL 友好的 slug
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * 从内容生成摘要
 */
function generateExcerpt(content: string, maxLength: number = 150): string {
  // 移除 Markdown 标记
  const plainText = content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n/g, ' ')
    .trim()

  if (plainText.length <= maxLength) {
    return plainText
  }

  return plainText.substring(0, maxLength).trim() + '...'
}
