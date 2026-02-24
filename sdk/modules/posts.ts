/**
 * Electron SDK - 文章模块
 * 处理文章列表、详情、评论等功能
 */

import type { ApiClient } from '../client'
import type {
  ApiResponse,
  Post,
  GetPostsParams,
  PostsResponse,
  Comment,
  CreateCommentParams,
} from '../types'

/**
 * 文章模块
 */
export class PostsModule {
  private client: ApiClient

  constructor(client: ApiClient) {
    this.client = client
  }

  /**
   * 获取文章列表
   * @param params 查询参数
   * @returns 文章列表
   * 
   * @example
   * ```typescript
   * // 获取第一页文章
   * const result = await sdk.posts.getList({ page: 1, limit: 10 })
   * if (result.success) {
   *   console.log('文章列表:', result.data.posts)
   *   console.log('总数:', result.data.total)
   * }
   * 
   * // 按分类筛选
   * const techPosts = await sdk.posts.getList({ category: '技术' })
   * 
   * // 搜索文章
   * const searchResult = await sdk.posts.getList({ search: '关键词' })
   * ```
   */
  async getList(params?: GetPostsParams): Promise<ApiResponse<PostsResponse>> {
    return this.client.get<PostsResponse>('/api/posts', params as Record<string, string | number | undefined>)
  }

  /**
   * 获取精选文章（最新文章）
   * @param limit 返回数量
   * @returns 文章列表
   * 
   * @example
   * ```typescript
   * const result = await sdk.posts.getFeatured(4)
   * if (result.success) {
   *   console.log('精选文章:', result.data.posts)
   * }
   * ```
   */
  async getFeatured(limit: number = 4): Promise<ApiResponse<PostsResponse>> {
    return this.getList({ page: 1, limit })
  }

  /**
   * 根据 slug 获取文章详情
   * @param slug 文章 slug
   * @returns 文章详情
   * 
   * @example
   * ```typescript
   * const result = await sdk.posts.getBySlug('my-first-post')
   * if (result.success) {
   *   console.log('文章详情:', result.data)
   * }
   * ```
   */
  async getBySlug(slug: string): Promise<ApiResponse<Post>> {
    return this.client.get<Post>(`/api/posts/${slug}`)
  }

  /**
   * 点赞文章
   * @param slug 文章 slug
   * @returns 点赞结果
   * 
   * @example
   * ```typescript
   * const result = await sdk.posts.like('my-first-post')
   * if (result.success) {
   *   console.log('点赞状态:', result.data.liked)
   *   console.log('总点赞数:', result.data.likes)
   * }
   * ```
   */
  async like(slug: string): Promise<ApiResponse<{ liked: boolean; likes: number }>> {
    return this.client.patch<{ liked: boolean; likes: number }>(`/api/posts/${slug}`, {
      action: 'like',
    })
  }

  /**
   * 收藏文章
   * @param slug 文章 slug
   * @returns 收藏结果
   * 
   * @example
   * ```typescript
   * const result = await sdk.posts.bookmark('my-first-post')
   * if (result.success) {
   *   console.log('收藏状态:', result.data.bookmarked)
   * }
   * ```
   */
  async bookmark(slug: string): Promise<ApiResponse<{ bookmarked: boolean }>> {
    return this.client.patch<{ bookmarked: boolean }>(`/api/posts/${slug}`, {
      action: 'bookmark',
    })
  }

  /**
   * 获取文章评论
   * @param postId 文章 ID
   * @param page 页码
   * @param limit 每页数量
   * @returns 评论列表
   * 
   * @example
   * ```typescript
   * const result = await sdk.posts.getComments('post_123')
   * if (result.success) {
   *   console.log('评论列表:', result.data)
   * }
   * ```
   */
  async getComments(
    postId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<{
    data: Comment[]
    total: number
    page: number
    limit: number
    maxDepth: number
    hasHiddenComments: boolean
  }>> {
    return this.client.get('/api/comments', { postId, page, limit })
  }

  /**
   * 发表评论
   * @param params 评论参数
   * @returns 新评论
   * 
   * @example
   * ```typescript
   * // 发表顶级评论
   * const result = await sdk.posts.createComment({
   *   postId: 'post_123',
   *   content: '这是一条评论'
   * })
   * 
   * // 回复评论
   * const replyResult = await sdk.posts.createComment({
   *   postId: 'post_123',
   *   content: '这是一条回复',
   *   parentId: 'comment_456'
   * })
   * ```
   */
  async createComment(params: CreateCommentParams): Promise<ApiResponse<Comment>> {
    return this.client.post<Comment>('/api/comments', params)
  }

  /**
   * 删除评论
   * @param commentId 评论 ID
   * @returns 删除结果
   */
  async deleteComment(commentId: string): Promise<ApiResponse<null>> {
    return this.client.delete<null>('/api/comments', { id: commentId })
  }

  /**
   * 编辑评论
   * @param commentId 评论 ID
   * @param content 新内容
   * @returns 更新后的评论
   */
  async editComment(commentId: string, content: string): Promise<ApiResponse<Comment>> {
    return this.client.put<Comment>('/api/comments', { id: commentId, content })
  }

  /**
   * 获取所有分类
   * @returns 分类列表
   * 
   * @example
   * ```typescript
   * const result = await sdk.posts.getCategories()
   * if (result.success) {
   *   console.log('分类:', result.data)
   * }
   * ```
   */
  async getCategories(): Promise<ApiResponse<string[]>> {
    return this.client.get<string[]>('/api/posts/categories')
  }

  /**
   * 获取所有标签
   * @returns 标签列表
   * 
   * @example
   * ```typescript
   * const result = await sdk.posts.getTags()
   * if (result.success) {
   *   console.log('标签:', result.data)
   * }
   * ```
   */
  async getTags(): Promise<ApiResponse<string[]>> {
    return this.client.get<string[]>('/api/posts/tags')
  }
}
