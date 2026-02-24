# Electron SDK

用于 Electron 项目与 Web API 对接的 TypeScript SDK。

## 安装

将 `sdk` 目录复制到你的 Electron 项目中。

## 快速开始

### 1. 初始化 SDK

```typescript
import { createSdk } from './sdk'

// 创建 SDK 实例
const sdk = createSdk({
  baseUrl: 'https://your-api.com',
  getToken: () => localStorage.getItem('auth_token'),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  },
  debug: true, // 可选，开启调试日志
})
```

### 2. 用户认证

```typescript
// 登录
const loginResult = await sdk.auth.login({
  email: 'user@example.com',
  password: 'password123'
})

if (loginResult.success) {
  console.log('登录成功:', loginResult.data.user)
  console.log('Token:', loginResult.data.token)
  // Token 会自动保存（通过 setToken 回调）
}

// 注册
const registerResult = await sdk.auth.register({
  email: 'new@example.com',
  password: 'password123',
  name: '新用户'
})

// 获取当前用户信息
const userResult = await sdk.auth.getCurrentUser()
if (userResult.success) {
  console.log('当前用户:', userResult.data)
}

// 检查是否已登录
const isLoggedIn = await sdk.auth.isLoggedIn()

// 登出
await sdk.auth.logout()
```

### 3. 文章功能

```typescript
// 获取文章列表
const postsResult = await sdk.posts.getList({ page: 1, limit: 10 })
if (postsResult.success) {
  console.log('文章列表:', postsResult.data.posts)
  console.log('总数:', postsResult.data.total)
}

// 获取精选文章
const featuredResult = await sdk.posts.getFeatured(4)

// 获取文章详情
const postResult = await sdk.posts.getBySlug('my-first-post')

// 点赞文章
const likeResult = await sdk.posts.like('my-first-post')
if (likeResult.success) {
  console.log('点赞状态:', likeResult.data.liked)
}

// 收藏文章
const bookmarkResult = await sdk.posts.bookmark('my-first-post')

// 获取文章评论
const commentsResult = await sdk.posts.getComments('post_123')

// 发表评论
const commentResult = await sdk.posts.createComment({
  postId: 'post_123',
  content: '这是一条评论'
})

// 回复评论
const replyResult = await sdk.posts.createComment({
  postId: 'post_123',
  content: '这是一条回复',
  parentId: 'comment_456'
})

// 获取分类和标签
const categories = await sdk.posts.getCategories()
const tags = await sdk.posts.getTags()
```

### 4. 商店功能

```typescript
// 获取产品列表
const productsResult = await sdk.shop.getProducts()
if (productsResult.success) {
  productsResult.data.forEach(product => {
    console.log(`${product.name}: ¥${product.price}`)
  })
}

// 按类型筛选产品
const memberships = await sdk.shop.getProducts({ type: 'membership' })

// 创建订单
const orderResult = await sdk.shop.createOrder({
  productId: 'product_123',
  paymentMethod: 'wechat',
  couponCode: 'DISCOUNT10' // 可选
})

if (orderResult.success) {
  console.log('订单创建成功:', orderResult.data)
}

// 获取订单列表
const ordersResult = await sdk.shop.getOrders()

// 获取待支付订单
const pendingOrders = await sdk.shop.getOrders({ status: 'pending' })

// 取消订单
const cancelResult = await sdk.shop.cancelOrder('order_123')

// 获取支付渠道
const channelsResult = await sdk.shop.getPaymentChannels()

// 发起支付
const payResult = await sdk.shop.pay('order_123', 'wechat')
if (payResult.success) {
  if (payResult.data.paymentUrl) {
    // 打开支付链接
    window.open(payResult.data.paymentUrl)
  }
  if (payResult.data.qrCode) {
    // 显示二维码供用户扫描
  }
}

// 轮询支付状态
const pollResult = await sdk.shop.pollPaymentStatus('order_123', 5 * 60 * 1000)
if (pollResult.success && pollResult.data.status === 'paid') {
  console.log('支付成功！')
  console.log('激活码:', pollResult.data.productKey)
}

// 验证优惠券
const couponResult = await sdk.shop.validateCoupon('DISCOUNT10', 100)
if (couponResult.success) {
  console.log('优惠券有效:', couponResult.data)
}

// 获取会员信息
const membershipResult = await sdk.shop.getMembership()

// 获取已购买的产品密钥
const keysResult = await sdk.shop.getMyKeys()
```

## API 参考

### SdkConfig 配置选项

| 选项 | 类型 | 必填 | 说明 |
|------|------|------|------|
| baseUrl | string | 是 | API 基础地址 |
| timeout | number | 否 | 请求超时时间（毫秒），默认 30000 |
| getToken | () => string \| null | 否 | 获取存储的 token |
| setToken | (token: string \| null) => void | 否 | 存储 token |
| debug | boolean | 否 | 是否开启调试模式 |

### AuthModule 认证模块

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| login | LoginParams | ApiResponse<LoginResponse> | 用户登录 |
| register | RegisterParams | ApiResponse<RegisterResponse> | 用户注册 |
| logout | - | ApiResponse<null> | 用户登出 |
| getCurrentUser | - | ApiResponse<User> | 获取当前用户信息 |
| isLoggedIn | - | Promise<boolean> | 检查是否已登录 |
| updateProfile | { name?, bio?, avatar? } | ApiResponse<User> | 更新用户资料 |
| changePassword | oldPassword, newPassword | ApiResponse<null> | 修改密码 |
| uploadAvatar | File | ApiResponse<{ url: string }> | 上传头像 |

### PostsModule 文章模块

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| getList | GetPostsParams? | ApiResponse<PostsResponse> | 获取文章列表 |
| getFeatured | limit? | ApiResponse<PostsResponse> | 获取精选文章 |
| getBySlug | slug | ApiResponse<Post> | 获取文章详情 |
| like | slug | ApiResponse<{ liked, likes }> | 点赞文章 |
| bookmark | slug | ApiResponse<{ bookmarked }> | 收藏文章 |
| getComments | postId, page?, limit? | ApiResponse<CommentData> | 获取评论列表 |
| createComment | CreateCommentParams | ApiResponse<Comment> | 发表评论 |
| deleteComment | commentId | ApiResponse<null> | 删除评论 |
| editComment | commentId, content | ApiResponse<Comment> | 编辑评论 |
| getCategories | - | ApiResponse<string[]> | 获取分类列表 |
| getTags | - | ApiResponse<string[]> | 获取标签列表 |

### ShopModule 商店模块

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| getProducts | GetProductsParams? | ApiResponse<Product[]> | 获取产品列表 |
| getProduct | productId | ApiResponse<Product> | 获取产品详情 |
| getOrders | GetOrdersParams? | ApiResponse<Order[]> | 获取订单列表 |
| getOrder | orderId | ApiResponse<OrderDetail> | 获取订单详情 |
| createOrder | CreateOrderParams | ApiResponse<Order> | 创建订单 |
| cancelOrder | orderId | ApiResponse<Order> | 取消订单 |
| getPaymentChannels | - | ApiResponse<PaymentChannel[]> | 获取支付渠道 |
| pay | orderId, paymentMethod | ApiResponse<PaymentResponse> | 发起支付 |
| queryPaymentStatus | orderId | ApiResponse<OrderDetail> | 查询支付状态 |
| pollPaymentStatus | orderId, timeout?, interval? | ApiResponse<OrderDetail> | 轮询支付状态 |
| validateCoupon | code, amount | ApiResponse<Coupon> | 验证优惠券 |
| getMembership | - | ApiResponse<Membership> | 获取会员信息 |
| getMyKeys | - | ApiResponse<ProductKey[]> | 获取已购密钥 |

## 类型定义

SDK 包含完整的 TypeScript 类型定义，详见 `types.ts` 文件。

主要类型包括：

- `User` - 用户信息
- `Post` - 文章信息
- `Product` - 产品信息
- `Order` - 订单信息
- `Comment` - 评论信息
- `Coupon` - 优惠券信息
- `ApiResponse<T>` - API 响应结构

## 错误处理

所有 API 调用都返回 `ApiResponse<T>` 类型，包含：

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

建议使用以下方式处理错误：

```typescript
const result = await sdk.auth.login({ email, password })

if (result.success) {
  // 成功处理
  console.log('登录成功:', result.data)
} else {
  // 错误处理
  console.error('登录失败:', result.error)
  // 可以显示错误提示给用户
  alert(result.error)
}
```

## Electron 集成示例

在 Electron 主进程中使用：

```typescript
// main.ts
import { app, BrowserWindow, ipcMain } from 'electron'
import { createSdk } from './sdk'

// 创建 SDK 实例
const sdk = createSdk({
  baseUrl: 'https://your-api.com',
  getToken: () => {
    // 从安全存储获取 token
    return safeStorage.getString('auth_token')
  },
  setToken: (token) => {
    if (token) {
      safeStorage.setString('auth_token', token)
    } else {
      safeStorage.delete('auth_token')
    }
  },
})

// IPC 处理登录
ipcMain.handle('auth:login', async (_, params) => {
  return await sdk.auth.login(params)
})

// IPC 处理获取文章
ipcMain.handle('posts:getList', async (_, params) => {
  return await sdk.posts.getList(params)
})

// IPC 处理创建订单
ipcMain.handle('shop:createOrder', async (_, params) => {
  return await sdk.shop.createOrder(params)
})

// IPC 处理支付
ipcMain.handle('shop:pay', async (_, orderId, method) => {
  return await sdk.shop.pay(orderId, method)
})
```

在渲染进程中调用：

```typescript
// renderer.ts
const result = await window.electron.invoke('auth:login', {
  email: 'user@example.com',
  password: 'password123'
})
```

## 许可证

MIT
