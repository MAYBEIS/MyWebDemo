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
  lastCommentAt?: Date | null // 最近评论时间
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
  sortBy?: 'createdAt' | 'lastCommentAt' | 'views' // 排序字段：发布时间、最近评论时间、阅读量
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
    sortBy = 'createdAt', // 默认按发布时间排序
  } = options

  // 构建查询条件
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    published: true,
  }

  // 按分类筛选
  if (category) {
    where.category = category
  }

  // 按标签筛选
  if (tag) {
    where.post_tags = {
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
  const total = await prisma.posts.count({ where })

  // 根据排序字段确定排序方式
  let orderBy: any
  if (sortBy === 'views') {
    // 按阅读量排序
    orderBy = { views: 'desc' }
  } else if (sortBy === 'lastCommentAt') {
    // 按最近评论时间排序 - 需要特殊处理
    // 由于 Prisma 不支持直接按关联表字段排序，我们需要在应用层处理
    orderBy = { createdAt: 'desc' } // 临时排序，后续会在应用层重新排序
  } else {
    // 默认按发布时间排序
    orderBy = { createdAt: 'desc' }
  }

  // 获取分页数据
  const posts = await prisma.posts.findMany({
    where,
    include: {
      users: {
        select: { name: true }
      },
      post_tags: true,
      // 获取每篇文章的最新评论时间
      comments: {
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }
    },
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
  })

  // 转换为 Post 格式
  let formattedPosts: Post[] = posts.map((post) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.post_tags.map((t) => t.tag),
    coverImage: post.coverImage,
    authorId: post.authorId,
    authorName: post.users.name,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    published: post.published,
    views: post.views,
    likes: post.likes,
    // 获取最近评论时间（如果有评论的话）
    lastCommentAt: post.comments && post.comments.length > 0 ? post.comments[0].createdAt : null,
  }))

  // 如果按最近评论时间排序，需要在应用层重新排序
  if (sortBy === 'lastCommentAt') {
    formattedPosts.sort((a, b) => {
      // 有评论的文章排在前面
      if (a.lastCommentAt && !b.lastCommentAt) return -1
      if (!a.lastCommentAt && b.lastCommentAt) return 1
      if (!a.lastCommentAt && !b.lastCommentAt) return 0
      // 都有评论，按评论时间降序
      return new Date(b.lastCommentAt!).getTime() - new Date(a.lastCommentAt!).getTime()
    })
  }

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
  const post = await prisma.posts.findUnique({
    where: { slug },
    include: {
      users: {
        select: { name: true }
      },
      post_tags: true,
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
    tags: post.post_tags.map((t) => t.tag),
    coverImage: post.coverImage,
    authorId: post.authorId,
    authorName: post.users.name,
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
  const id = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const post = await prisma.posts.create({
    data: {
      id,
      slug,
      title: input.title,
      content: input.content,
      excerpt,
      category: input.category,
      coverImage: input.coverImage,
      authorId: input.authorId,
      published: true,
      updatedAt: new Date(),
      post_tags: input.tags ? {
        create: input.tags.map((tag) => ({
          id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tag
        }))
      } : undefined,
    },
    include: {
      users: { select: { name: true } },
      post_tags: true,
    },
  })

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.post_tags.map((t) => t.tag),
    coverImage: post.coverImage,
    authorId: post.authorId,
    authorName: post.users.name,
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
  const existingPost = await prisma.posts.findUnique({
    where: { slug },
  })

  if (!existingPost) {
    return null
  }

  // 如果标题改变，更新 slug
  const newSlug = input.title ? generateSlug(input.title) : slug

  // 准备更新数据
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    slug: newSlug,
    updatedAt: new Date(),
  }

  // 只更新提供的字段
  if (input.title !== undefined) updateData.title = input.title
  if (input.content !== undefined) updateData.content = input.content
  if (input.excerpt !== undefined) updateData.excerpt = input.excerpt
  if (input.category !== undefined) updateData.category = input.category
  if (input.coverImage !== undefined) updateData.coverImage = input.coverImage
  if (input.published !== undefined) updateData.published = input.published

  // 更新标签
  if (input.tags !== undefined) {
    updateData.post_tags = {
      deleteMany: {},
      create: input.tags.map((tag) => ({
        id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tag
      })),
    }
  }

  // 更新文章
  const post = await prisma.posts.update({
    where: { slug },
    data: updateData,
    include: {
      users: { select: { name: true } },
      post_tags: true,
    },
  })

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.post_tags.map((t: { tag: string }) => t.tag),
    coverImage: post.coverImage,
    authorId: post.authorId,
    authorName: post.users?.name,
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
    await prisma.posts.delete({
      where: { slug },
    })
    return true
  } catch {
    return false
  }
}

/**
 * 增加文章浏览量
 */
export async function incrementViews(slug: string): Promise<void> {
  await prisma.posts.update({
    where: { slug },
    data: { views: { increment: 1 } },
  })
}

/**
 * 增加文章点赞数
 */
export async function incrementLikes(slug: string): Promise<void> {
  await prisma.posts.update({
    where: { slug },
    data: { likes: { increment: 1 } },
  })
}

/**
 * 切换文章点赞状态
 * @returns { liked: boolean, likes: number } - 返回新的点赞状态和总点赞数
 */
export async function toggleLike(slug: string, userId: string): Promise<{ liked: boolean; likes: number }> {
  // 先获取文章
  const post = await prisma.posts.findUnique({
    where: { slug },
    select: { id: true, likes: true }
  })

  if (!post) {
    throw new Error('文章不存在')
  }

  // 检查用户是否已点赞
  const existingLike = await prisma.post_likes.findUnique({
    where: {
      postId_userId: {
        postId: post.id,
        userId
      }
    }
  })

  if (existingLike) {
    // 已点赞，取消点赞
    await prisma.post_likes.delete({
      where: { id: existingLike.id }
    })
    // 减少点赞数
    await prisma.posts.update({
      where: { slug },
      data: { likes: { decrement: 1 } }
    })
    
    const updatedPost = await prisma.posts.findUnique({
      where: { slug },
      select: { likes: true }
    })
    
    return { liked: false, likes: updatedPost?.likes || 0 }
  } else {
    // 未点赞，添加点赞
    await prisma.post_likes.create({
      data: {
        id: `like_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        postId: post.id,
        userId
      }
    })
    // 增加点赞数
    await prisma.posts.update({
      where: { slug },
      data: { likes: { increment: 1 } }
    })
    
    const updatedPost = await prisma.posts.findUnique({
      where: { slug },
      select: { likes: true }
    })
    
    return { liked: true, likes: updatedPost?.likes || 0 }
  }
}

/**
 * 切换文章收藏状态
 * @returns { bookmarked: boolean } - 返回新的收藏状态
 */
export async function toggleBookmark(slug: string, userId: string): Promise<{ bookmarked: boolean }> {
  // 先获取文章
  const post = await prisma.posts.findUnique({
    where: { slug },
    select: { id: true }
  })

  if (!post) {
    throw new Error('文章不存在')
  }

  // 检查用户是否已收藏
  const existingBookmark = await prisma.post_bookmarks.findUnique({
    where: {
      postId_userId: {
        postId: post.id,
        userId
      }
    }
  })

  if (existingBookmark) {
    // 已收藏，取消收藏
    await prisma.post_bookmarks.delete({
      where: { id: existingBookmark.id }
    })
    return { bookmarked: false }
  } else {
    // 未收藏，添加收藏
    await prisma.post_bookmarks.create({
      data: {
        id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        postId: post.id,
        userId
      }
    })
    return { bookmarked: true }
  }
}

/**
 * 获取用户对文章的互动状态（点赞和收藏）
 */
export async function getPostInteractionStatus(slug: string, userId: string): Promise<{ liked: boolean; bookmarked: boolean }> {
  const post = await prisma.posts.findUnique({
    where: { slug },
    select: { id: true }
  })

  if (!post) {
    return { liked: false, bookmarked: false }
  }

  const [likeRecord, bookmarkRecord] = await Promise.all([
    prisma.post_likes.findUnique({
      where: {
        postId_userId: {
          postId: post.id,
          userId
        }
      }
    }),
    prisma.post_bookmarks.findUnique({
      where: {
        postId_userId: {
          postId: post.id,
          userId
        }
      }
    })
  ])

  return {
    liked: !!likeRecord,
    bookmarked: !!bookmarkRecord
  }
}

/**
 * 获取所有分类
 */
export async function getCategories(): Promise<string[]> {
  const categories = await prisma.posts.findMany({
    where: { published: true },
    select: { category: true },
    distinct: ['category'],
  })
  return categories
    .map((c) => c.category)
    .filter((c): c is string => c !== null)
}

/**
 * 获取所有标签
 */
export async function getTags(): Promise<string[]> {
  const tags = await prisma.post_tags.findMany({
    distinct: ['tag'],
    select: { tag: true },
  })
  return tags.map((t) => t.tag)
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
