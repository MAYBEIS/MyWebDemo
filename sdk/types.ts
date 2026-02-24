/**
 * Electron SDK - 类型定义
 * 用于 Electron 项目与 Web API 对接
 */

// ==================== 通用类型 ====================

/**
 * API 响应基础结构
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number
  limit?: number
}

/**
 * 分页响应数据
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

// ==================== 用户认证类型 ====================

/**
 * 用户信息
 */
export interface User {
  id: string
  email: string
  name: string
  isAdmin: boolean
  avatar?: string | null
  bio?: string | null
}

/**
 * 登录请求参数
 */
export interface LoginParams {
  email: string
  password: string
}

/**
 * 登录响应数据
 */
export interface LoginResponse {
  user: User
  token: string
}

/**
 * 注册请求参数
 */
export interface RegisterParams {
  email: string
  password: string
  name: string
}

/**
 * 注册响应数据
 */
export interface RegisterResponse {
  user: User
  token: string
}

// ==================== 文章类型 ====================

/**
 * 文章信息
 */
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
  lastCommentAt?: string | null
}

/**
 * 文章列表请求参数
 */
export interface GetPostsParams extends PaginationParams {
  category?: string
  tag?: string
  search?: string
}

/**
 * 文章列表响应
 */
export interface PostsResponse {
  posts: Post[]
  total: number
  page: number
  limit: number
}

// ==================== 产品类型 ====================

/**
 * 产品类型枚举
 */
export type ProductType = 'membership' | 'software' | 'course' | 'other'

/**
 * 产品信息
 */
export interface Product {
  id: string
  name: string
  description: string
  price: number
  type: ProductType
  duration?: number | null
  features?: string | null
  image?: string | null
  stock: number
  availableStock: number
  sortOrder: number
  status: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 产品列表请求参数
 */
export interface GetProductsParams {
  type?: ProductType
  status?: 'all' | 'active'
}

// ==================== 订单类型 ====================

/**
 * 订单状态枚举
 */
export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded'

/**
 * 订单信息
 */
export interface Order {
  id: string
  orderNo: string
  userId: string
  productId: string
  amount: number
  status: OrderStatus
  paymentMethod?: string | null
  paymentTime?: Date | null
  productKey?: string | null
  remark?: string | null
  createdAt: string
  updatedAt: string
  products?: {
    id: string
    name: string
    type: ProductType
    image?: string | null
    description: string
    price: number
  }
  users?: {
    id: string
    name: string
    email: string
  }
  product_keys?: Array<{
    id: string
    key: string
    status: string
    expiresAt?: Date | null
  }>
}

/**
 * 创建订单请求参数
 */
export interface CreateOrderParams {
  productId: string
  paymentMethod?: string
  couponCode?: string
}

/**
 * 订单列表请求参数
 */
export interface GetOrdersParams {
  status?: OrderStatus
  admin?: boolean
}

// ==================== 评论类型 ====================

/**
 * 评论作者信息
 */
export interface CommentAuthor {
  id: string
  name: string
  avatar: string | null
  isAdmin: boolean
}

/**
 * 评论信息
 */
export interface Comment {
  id: string
  content: string
  createdAt: string
  author: CommentAuthor
  replies: Comment[]
}

/**
 * 创建评论请求参数
 */
export interface CreateCommentParams {
  postId: string
  content: string
  parentId?: string
}

// ==================== 优惠券类型 ====================

/**
 * 优惠券类型
 */
export type CouponType = 'percentage' | 'fixed'

/**
 * 优惠券信息
 */
export interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number
  minAmount: number
  maxDiscount?: number | null
  totalCount: number
  usedCount: number
  startTime: string
  endTime: string
  status: boolean
}

/**
 * 验证优惠券请求参数
 */
export interface ValidateCouponParams {
  code: string
  amount: number
}

// ==================== SDK 配置类型 ====================

/**
 * SDK 配置
 */
export interface SdkConfig {
  /** API 基础地址 */
  baseUrl: string
  /** 请求超时时间（毫秒） */
  timeout?: number
  /** 获取认证 token 的函数 */
  getToken?: () => string | null
  /** 存储 token 的函数 */
  setToken?: (token: string | null) => void
}

/**
 * SDK 初始化选项
 */
export interface SdkOptions extends SdkConfig {
  /** 是否开启调试模式 */
  debug?: boolean
}
