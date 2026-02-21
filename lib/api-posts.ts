/**
 * 文章 API 客户端
 * 用于从后端 API 获取文章数据
 */

// 文章类型定义
export interface Post {
  id: string
  slug: string
  title: string
  content: string
  excerpt: string | null
  category: string | null
  tags: string[]
  coverImage: string | null
  authorId: string
  authorName?: string
  createdAt: string
  updatedAt: string
  published: boolean
  views: number
  likes: number
}

export interface PostsResponse {
  posts: Post[]
  total: number
  page: number
  limit: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 获取文章列表
 * @param options 查询选项
 */
export async function fetchPosts(options: {
  page?: number
  limit?: number
  category?: string
  tag?: string
  search?: string
} = {}): Promise<PostsResponse> {
  const { page = 1, limit = 10, category, tag, search } = options

  // 构建查询参数
  const params = new URLSearchParams()
  params.set('page', page.toString())
  params.set('limit', limit.toString())
  if (category) params.set('category', category)
  if (tag) params.set('tag', tag)
  if (search) params.set('search', search)

  try {
    const response = await fetch(`/api/posts?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // 确保每次请求都获取最新数据
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch posts')
    }

    const result: ApiResponse<PostsResponse> = await response.json()

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch posts')
    }

    return result.data
  } catch (error) {
    console.error('Error fetching posts:', error)
    return {
      posts: [],
      total: 0,
      page: 1,
      limit: 10,
    }
  }
}

/**
 * 获取精选文章（最新的已发布文章）
 * @param limit 返回文章数量
 */
export async function fetchFeaturedPosts(limit: number = 4): Promise<Post[]> {
  const result = await fetchPosts({ page: 1, limit })
  return result.posts
}

/**
 * 获取所有分类
 */
export async function fetchCategories(): Promise<string[]> {
  try {
    const response = await fetch('/api/posts/categories', {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const result = await response.json()
    return result.success ? result.data : []
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

/**
 * 获取所有标签
 */
export async function fetchTags(): Promise<string[]> {
  try {
    const response = await fetch('/api/posts/tags', {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const result = await response.json()
    return result.success ? result.data : []
  } catch (error) {
    console.error('Error fetching tags:', error)
    return []
  }
}

/**
 * 格式化日期为本地字符串
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * 计算阅读时间（基于内容长度）
 */
export function calculateReadTime(content: string): string {
  // 假设平均阅读速度：每分钟 200 字
  const wordsPerMinute = 200
  const charCount = content.length
  const minutes = Math.ceil(charCount / (wordsPerMinute * 5)) // 中文字符约占 5 个英文字符的位置
  
  return `${minutes} 分钟`
}

/**
 * 格式化浏览量
 */
export function formatViews(views: number): string {
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}k`
  }
  return views.toString()
}
