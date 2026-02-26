/**
 * 数据库种子文件
 * 初始化默认用户和示例数据
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始播种数据库...')

  // 清理现有数据
  // await prisma.comment_likes.deleteMany()
  await prisma.comments.deleteMany()
  await prisma.post_tags.deleteMany()
  await prisma.post_likes.deleteMany()
  await prisma.post_bookmarks.deleteMany()
  await prisma.posts.deleteMany()
  await prisma.guestbooks.deleteMany()
  await prisma.sessions.deleteMany()
  await prisma.user_coupons.deleteMany()
  await prisma.coupons.deleteMany()
  await prisma.product_keys.deleteMany()
  await prisma.orders.deleteMany()
  await prisma.user_memberships.deleteMany()
  await prisma.products.deleteMany()
  await prisma.payment_channels.deleteMany()
  await prisma.users.deleteMany()
  await prisma.system_settings.deleteMany()

  console.log('✅ 清理完成')

  // 创建系统设置
  await prisma.system_settings.createMany({
    data: [
      { id: `setting_${Date.now()}_1`, key: 'site_title', value: 'SysLog', description: '网站标题' },
      { id: `setting_${Date.now()}_2`, key: 'site_description', value: '一个现代化的技术博客', description: '网站描述' },
      { id: `setting_${Date.now()}_3`, key: 'comment_max_depth', value: '3', description: '评论最大深度' },
      { id: `setting_${Date.now()}_4`, key: 'section_blog_enabled', value: 'true', description: '博客模块开关' },
      { id: `setting_${Date.now()}_5`, key: 'section_shop_enabled', value: 'true', description: '商店模块开关' },
      { id: `setting_${Date.now()}_6`, key: 'section_trending_enabled', value: 'true', description: '热榜模块开关' },
      { id: `setting_${Date.now()}_7`, key: 'section_quiz_enabled', value: 'true', description: '每日挑战模块开关' },
      { id: `setting_${Date.now()}_8`, key: 'section_guestbook_enabled', value: 'true', description: '留言板模块开关' },
    ],
  })
  console.log('✅ 创建系统设置')

  // 创建管理员用户
  const hashedAdminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.users.create({
    data: {
      id: `user_${Date.now()}_admin`,
      email: 'admin@example.com',
      name: '管理员',
      password: hashedAdminPassword,
      isAdmin: true,
      avatar: 'GL',
      bio: '系统程序员 & 技术作者 | 探索内核、编译器与高性能计算的深度奥秘',
      updatedAt: new Date(),
    },
  })
  console.log('✅ 创建管理员用户:', admin.email)

  // 创建普通用户
  const hashedUserPassword = await bcrypt.hash('user123', 12)
  const users = await Promise.all([
    prisma.users.create({
      data: {
        id: `user_${Date.now()}_user1`,
        email: 'user@example.com',
        name: '张三',
        password: hashedUserPassword,
        isAdmin: false,
        avatar: 'ZS',
        bio: '热爱编程的开发者',
        updatedAt: new Date(),
      },
    }),
    prisma.users.create({
      data: {
        id: `user_${Date.now()}_user2`,
        email: 'lisi@example.com',
        name: '李四',
        password: hashedUserPassword,
        isAdmin: false,
        avatar: 'LS',
        bio: '前端工程师',
        updatedAt: new Date(),
      },
    }),
    prisma.users.create({
      data: {
        id: `user_${Date.now()}_user3`,
        email: 'wangwu@example.com',
        name: '王五',
        password: hashedUserPassword,
        isAdmin: false,
        avatar: 'WW',
        bio: '后端开发者',
        updatedAt: new Date(),
      },
    }),
    prisma.users.create({
      data: {
        id: `user_${Date.now()}_user4`,
        email: 'zhaoliu@example.com',
        name: '赵六',
        password: hashedUserPassword,
        isAdmin: false,
        avatar: 'ZL',
        bio: '全栈工程师',
        updatedAt: new Date(),
      },
    }),
    prisma.users.create({
      data: {
        id: `user_${Date.now()}_user5`,
        email: 'sunqi@example.com',
        name: '孙七',
        password: hashedUserPassword,
        isAdmin: false,
        avatar: 'SQ',
        bio: '移动端开发者',
        updatedAt: new Date(),
      },
    }),
  ])
  console.log('✅ 创建普通用户:', users.length, '个')

  // 创建示例文章
  const posts = await Promise.all([
    prisma.posts.create({
      data: {
        id: `post_${Date.now()}_1`,
        slug: 'nextjs-app-router-introduction',
        title: 'Next.js App Router 完全指南',
        content: `# Next.js App Router 简介

App Router 是 Next.js 13 引入的新路由系统，它基于 React Server Components 构建，提供了更好的性能和开发体验。

## 主要特性

### 1. 服务端组件
服务端组件允许你在服务器上渲染组件，减少发送到客户端的 JavaScript 量。

\`\`\`tsx
// 默认就是服务端组件
async function BlogPost({ slug }: { slug: string }) {
  const post = await getPost(slug)
  return <article>{post.content}</article>
}
\`\`\`

### 2. 流式渲染
支持 React 的 Suspense，实现渐进式页面加载。

### 3. 路由组
使用括号创建路由组，不影响 URL 结构。

## 最佳实践

1. 尽可能使用服务端组件
2. 只在需要交互时使用客户端组件
3. 合理使用缓存策略

## 总结

App Router 代表了 React 应用的未来方向，值得深入学习和实践。`,
        excerpt: '深入了解 Next.js App Router 的工作原理和最佳实践',
        category: '前端开发',
        coverImage: '/images/blog/nextjs.jpg',
        published: true,
        views: 1256,
        likes: 89,
        authorId: admin.id,
        updatedAt: new Date(),
        post_tags: {
          create: [
            { id: `tag_${Date.now()}_1`, tag: 'Next.js' },
            { id: `tag_${Date.now()}_2`, tag: 'React' },
            { id: `tag_${Date.now()}_3`, tag: '前端' },
          ],
        },
      },
    }),
    prisma.posts.create({
      data: {
        id: `post_${Date.now()}_2`,
        slug: 'typescript-best-practices',
        title: 'TypeScript 最佳实践',
        content: `# TypeScript 最佳实践

TypeScript 提供了强大的类型系统，帮助我们在开发阶段发现潜在问题。

## 类型定义技巧

### 使用类型推断
让 TypeScript 自动推断类型，减少冗余代码。

\`\`\`typescript
// 好的做法
const numbers = [1, 2, 3] // 自动推断为 number[]

// 避免过度标注
const numbers: number[] = [1, 2, 3] // 不必要
\`\`\`

### 使用 const 断言
\`\`\`typescript
const config = {
  endpoint: '/api',
  method: 'GET'
} as const
\`\`\`

## 泛型使用

合理使用泛型可以提高代码复用性。

## 总结

掌握 TypeScript 需要持续学习和实践。`,
        excerpt: '掌握 TypeScript 的核心概念和实用技巧',
        category: '编程语言',
        coverImage: '/images/blog/typescript.jpg',
        published: true,
        views: 987,
        likes: 67,
        authorId: admin.id,
        updatedAt: new Date(),
        post_tags: {
          create: [
            { id: `tag_${Date.now()}_4`, tag: 'TypeScript' },
            { id: `tag_${Date.now()}_5`, tag: 'JavaScript' },
            { id: `tag_${Date.now()}_6`, tag: '类型系统' },
          ],
        },
      },
    }),
    prisma.posts.create({
      data: {
        id: `post_${Date.now()}_3`,
        slug: 'react-hooks-deep-dive',
        title: 'React Hooks 深度解析',
        content: `# React Hooks 深度解析

React Hooks 改变了我们编写组件的方式，让函数组件拥有了状态和生命周期。

## useState 详解

\`\`\`tsx
const [state, setState] = useState(initialValue)
\`\`\`

## useEffect 详解

\`\`\`tsx
useEffect(() => {
  // 副作用逻辑
  return () => {
    // 清理函数
  }
}, [dependencies])
\`\`\`

## 自定义 Hook

将复用逻辑抽取为自定义 Hook。

## 总结

Hooks 是 React 开发的核心技能。`,
        excerpt: '全面理解 React Hooks 的工作机制和使用场景',
        category: '前端开发',
        coverImage: '/images/blog/react.jpg',
        published: true,
        views: 2341,
        likes: 156,
        authorId: admin.id,
        updatedAt: new Date(),
        post_tags: {
          create: [
            { id: `tag_${Date.now()}_7`, tag: 'React' },
            { id: `tag_${Date.now()}_8`, tag: 'Hooks' },
            { id: `tag_${Date.now()}_9`, tag: '状态管理' },
          ],
        },
      },
    }),
    prisma.posts.create({
      data: {
        id: `post_${Date.now()}_4`,
        slug: 'nodejs-performance-optimization',
        title: 'Node.js 性能优化实战',
        content: `# Node.js 性能优化实战

Node.js 应用的性能优化是后端开发中的重要课题。

## 内存管理

理解 V8 的垃圾回收机制，避免内存泄漏。

## 异步优化

合理使用 Promise 和 async/await，避免阻塞事件循环。

## 集群模式

利用 cluster 模块充分利用多核 CPU。

## 总结

性能优化需要持续关注和测试。`,
        excerpt: '提升 Node.js 应用性能的实用技巧',
        category: '后端开发',
        coverImage: '/images/blog/nodejs.jpg',
        published: true,
        views: 876,
        likes: 45,
        authorId: admin.id,
        updatedAt: new Date(),
        post_tags: {
          create: [
            { id: `tag_${Date.now()}_10`, tag: 'Node.js' },
            { id: `tag_${Date.now()}_11`, tag: '性能优化' },
            { id: `tag_${Date.now()}_12`, tag: '后端' },
          ],
        },
      },
    }),
    prisma.posts.create({
      data: {
        id: `post_${Date.now()}_5`,
        slug: 'docker-containerization-guide',
        title: 'Docker 容器化部署指南',
        content: `# Docker 容器化部署指南

Docker 让应用部署变得更加简单和一致。

## Dockerfile 编写

\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

## Docker Compose

使用 Docker Compose 管理多容器应用。

## 最佳实践

1. 使用多阶段构建减小镜像体积
2. 合理利用缓存层
3. 注意安全性配置

## 总结

容器化是现代应用部署的标准做法。`,
        excerpt: '从零开始学习 Docker 容器化部署',
        category: 'DevOps',
        coverImage: '/images/blog/docker.jpg',
        published: true,
        views: 654,
        likes: 38,
        authorId: admin.id,
        updatedAt: new Date(),
        post_tags: {
          create: [
            { id: `tag_${Date.now()}_13`, tag: 'Docker' },
            { id: `tag_${Date.now()}_14`, tag: 'DevOps' },
            { id: `tag_${Date.now()}_15`, tag: '容器化' },
          ],
        },
      },
    }),
    prisma.posts.create({
      data: {
        id: `post_${Date.now()}_6`,
        slug: 'rust-system-programming',
        title: 'Rust 系统编程入门',
        content: `# Rust 系统编程入门

Rust 是一门专注于安全和性能的系统编程语言。

## 所有权系统

Rust 的所有权系统是其核心特性，确保内存安全。

## 借用和生命周期

理解借用规则和生命周期标注。

## 异步编程

使用 async/await 进行异步编程。

## 总结

Rust 学习曲线陡峭，但值得投入。`,
        excerpt: 'Rust 语言基础与系统编程实践',
        category: '系统编程',
        coverImage: '/images/blog/rust.jpg',
        published: true,
        views: 543,
        likes: 29,
        authorId: admin.id,
        updatedAt: new Date(),
        post_tags: {
          create: [
            { id: `tag_${Date.now()}_16`, tag: 'Rust' },
            { id: `tag_${Date.now()}_17`, tag: '系统编程' },
            { id: `tag_${Date.now()}_18`, tag: '内存安全' },
          ],
        },
      },
    }),
  ])

  console.log('✅ 创建示例文章:', posts.length, '篇')

  // 创建示例评论
  const user1 = users[0]
  const user2 = users[1]
  const user3 = users[2]

  // 文章1的评论
  const comment1 = await prisma.comments.create({
    data: {
      id: `comment_${Date.now()}_1`,
      content: '非常详细的教程，学到了很多！',
      postId: posts[0].id,
      authorId: user1.id,
      updatedAt: new Date(),
    },
  })

  const comment2 = await prisma.comments.create({
    data: {
      id: `comment_${Date.now()}_2`,
      content: 'App Router 确实很强大，但迁移成本也不小。',
      postId: posts[0].id,
      authorId: user2.id,
      updatedAt: new Date(),
    },
  })

  // 回复评论
  await prisma.comments.create({
    data: {
      id: `comment_${Date.now()}_3`,
      content: '是的，但长期来看是值得的。',
      postId: posts[0].id,
      authorId: admin.id,
      parentId: comment2.id,
      updatedAt: new Date(),
    },
  })

  // 文章2的评论
  await prisma.comments.create({
    data: {
      id: `comment_${Date.now()}_4`,
      content: 'TypeScript 的类型系统真的很强大！',
      postId: posts[1].id,
      authorId: user3.id,
      updatedAt: new Date(),
    },
  })

  await prisma.comments.create({
    data: {
      id: `comment_${Date.now()}_5`,
      content: '建议增加一些高级类型的讲解。',
      postId: posts[1].id,
      authorId: user1.id,
      updatedAt: new Date(),
    },
  })

  // 文章3的评论
  await prisma.comments.create({
    data: {
      id: `comment_${Date.now()}_6`,
      content: 'Hooks 刚出来时很不习惯，现在离不开了。',
      postId: posts[2].id,
      authorId: user2.id,
      updatedAt: new Date(),
    },
  })

  console.log('✅ 创建示例评论')

  // 创建产品
  const products = await Promise.all([
    prisma.products.create({
      data: {
        id: `product_${Date.now()}_1`,
        name: '月度会员',
        description: '享受30天的会员特权，包括专属内容和优先支持',
        price: 29.9,
        type: 'membership',
        duration: 30,
        features: JSON.stringify(['专属文章', '优先客服', '无广告体验']),
        stock: -1,
        status: true,
        sortOrder: 1,
      },
    }),
    prisma.products.create({
      data: {
        id: `product_${Date.now()}_2`,
        name: '年度会员',
        description: '享受365天的会员特权，性价比之选',
        price: 199,
        type: 'membership',
        duration: 365,
        features: JSON.stringify(['专属文章', '优先客服', '无广告体验', '专属徽章']),
        stock: -1,
        status: true,
        sortOrder: 2,
      },
    }),
    prisma.products.create({
      data: {
        id: `product_${Date.now()}_3`,
        name: '高级开发工具包',
        description: '包含一套完整的开发工具和模板',
        price: 99,
        type: 'digital',
        features: JSON.stringify(['源码模板', '开发文档', '技术支持']),
        stock: 100,
        status: true,
        sortOrder: 3,
      },
    }),
  ])

  console.log('✅ 创建产品:', products.length, '个')

  // 创建产品密钥
  await prisma.product_keys.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      id: `key_${Date.now()}_${i}`,
      productId: products[2].id,
      key: `DEV-TOOL-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      status: 'available',
    })),
  })

  console.log('✅ 创建产品密钥: 10 个')

  // 创建优惠券
  await prisma.coupons.create({
    data: {
      id: `coupon_${Date.now()}_1`,
      code: 'WELCOME10',
      name: '新用户欢迎优惠券',
      type: 'percentage',
      value: 10,
      minAmount: 50,
      maxDiscount: 20,
      totalCount: 100,
      usedCount: 0,
      startTime: new Date(),
      endTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: true,
    },
  })

  console.log('✅ 创建优惠券')

  // 创建支付渠道
  await prisma.payment_channels.createMany({
    data: [
      {
        id: `channel_${Date.now()}_1`,
        code: 'wechat',
        name: '微信支付',
        description: '使用微信扫码支付',
        enabled: true,
        config: JSON.stringify({ appId: '', mchId: '', apiKey: '' }),
      },
      {
        id: `channel_${Date.now()}_2`,
        code: 'alipay',
        name: '支付宝',
        description: '使用支付宝扫码支付',
        enabled: false,
        config: JSON.stringify({ appId: '', privateKey: '' }),
      },
    ],
  })

  console.log('✅ 创建支付渠道')

  // 创建示例订单
  await prisma.orders.create({
    data: {
      id: `order_${Date.now()}_1`,
      orderNo: `ORD${new Date().toISOString().slice(0, 10).replace(/-/g, '')}TEST01`,
      userId: user1.id,
      productId: products[0].id,
      amount: 29.9,
      status: 'paid',
      paymentMethod: 'wechat',
      paymentTime: new Date(),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
    },
  })

  await prisma.orders.create({
    data: {
      id: `order_${Date.now()}_2`,
      orderNo: `ORD${new Date().toISOString().slice(0, 10).replace(/-/g, '')}TEST02`,
      userId: user2.id,
      productId: products[1].id,
      amount: 199,
      status: 'paid',
      paymentMethod: 'wechat',
      paymentTime: new Date(),
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1天前
    },
  })

  await prisma.orders.create({
    data: {
      id: `order_${Date.now()}_3`,
      orderNo: `ORD${new Date().toISOString().slice(0, 10).replace(/-/g, '')}TEST03`,
      userId: user3.id,
      productId: products[2].id,
      amount: 99,
      status: 'pending',
      createdAt: new Date(),
    },
  })

  console.log('✅ 创建示例订单')

  // 创建示例留言
  await prisma.guestbooks.createMany({
    data: [
      {
        id: `guestbook_${Date.now()}_1`,
        message: '很棒的博客！内容很有深度，学到了很多。',
        authorId: user1.id,
        updatedAt: new Date(),
      },
      {
        id: `guestbook_${Date.now()}_2`,
        message: '期待更多关于系统编程的文章！',
        authorId: user2.id,
        updatedAt: new Date(),
      },
      {
        id: `guestbook_${Date.now()}_3`,
        message: '设计很漂亮，阅读体验很好！',
        authorId: user3.id,
        updatedAt: new Date(),
      },
    ],
  })

  console.log('✅ 创建示例留言')

  // 创建热榜话题
  const topics = await Promise.all([
    prisma.trending_topics.create({
      data: {
        id: `topic_${Date.now()}_1`,
        title: 'Rust 能否取代 C 成为内核开发的主力语言？',
        description: '随着 Rust for Linux 项目的推进，越来越多的内核模块开始用 Rust 编写。你认为 Rust 最终能取代 C 在内核开发中的地位吗？',
        category: '语言之争',
        votes: 247,
        heat: 98,
        tags: JSON.stringify(['Rust', 'C', 'Linux 内核']),
        proposedBy: admin.name,
        status: 'active',
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
      },
    }),
    prisma.trending_topics.create({
      data: {
        id: `topic_${Date.now()}_2`,
        title: 'io_uring vs epoll：下一代 I/O 多路复用的选择',
        description: 'io_uring 提供了更统一和高效的异步 I/O 接口，但 epoll 更成熟稳定。在新项目中你会选择哪个？',
        category: '技术选型',
        votes: 183,
        heat: 85,
        tags: JSON.stringify(['io_uring', 'epoll', 'Linux']),
        proposedBy: users[0].name,
        status: 'active',
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    }),
    prisma.trending_topics.create({
      data: {
        id: `topic_${Date.now()}_3`,
        title: 'eBPF 是否是可观测性的终极解决方案？',
        description: 'eBPF 允许在内核中安全运行自定义程序，正在革新系统监控和安全领域。你怎么看它的未来？',
        category: '前沿技术',
        votes: 156,
        heat: 79,
        tags: JSON.stringify(['eBPF', '可观测性', '安全']),
        proposedBy: users[1].name,
        status: 'active',
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    }),
    prisma.trending_topics.create({
      data: {
        id: `topic_${Date.now()}_4`,
        title: 'RISC-V 会成为下一个 ARM 吗？',
        description: 'RISC-V 的开放指令集架构正在快速发展。从嵌入式到服务器，RISC-V 能在多大程度上挑战 ARM 和 x86 的地位？',
        category: '硬件架构',
        votes: 134,
        heat: 72,
        tags: JSON.stringify(['RISC-V', 'ARM', 'ISA']),
        proposedBy: users[2].name,
        status: 'active',
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    }),
    prisma.trending_topics.create({
      data: {
        id: `topic_${Date.now()}_5`,
        title: 'WebAssembly 能否成为服务端的通用运行时？',
        description: 'WASI 和 Component Model 正在让 Wasm 超越浏览器。作为服务端沙箱运行时，它能取代容器吗？',
        category: '新方向',
        votes: 98,
        heat: 61,
        tags: JSON.stringify(['Wasm', 'WASI', '云原生']),
        proposedBy: users[3].name,
        status: 'active',
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    }),
  ])

  console.log('✅ 创建热榜话题:', topics.length, '个')

  // 为热榜话题创建评论
  await prisma.topic_comments.createMany({
    data: [
      {
        id: `topic_comment_${Date.now()}_1`,
        topicId: topics[0].id,
        userId: users[0].id,
        content: 'C 在内核中的生态太成熟了，短期内不可能替代，但 Rust 作为补充非常合适。',
      },
      {
        id: `topic_comment_${Date.now()}_2`,
        topicId: topics[0].id,
        userId: users[1].id,
        content: '所有权模型天然适合内核开发，Use-after-free 这种 bug 直接在编译期消除。',
      },
      {
        id: `topic_comment_${Date.now()}_3`,
        topicId: topics[0].id,
        userId: admin.id,
        content: '我认为两者会长期共存。新模块用 Rust 写是趋势，但重写已有代码不现实。',
      },
      {
        id: `topic_comment_${Date.now()}_4`,
        topicId: topics[1].id,
        userId: users[2].id,
        content: 'io_uring 在高并发场景下吞吐量提升 30%+，没有理由不用。',
      },
      {
        id: `topic_comment_${Date.now()}_5`,
        topicId: topics[1].id,
        userId: users[3].id,
        content: 'epoll 经过二十年实战验证，io_uring 的安全问题值得警惕。',
      },
      {
        id: `topic_comment_${Date.now()}_6`,
        topicId: topics[2].id,
        userId: users[0].id,
        content: 'eBPF 不只是可观测性，它在安全、网络方面的应用同样革命性。',
      },
    ],
  })

  console.log('✅ 创建热榜评论')

  // 为热榜话题创建投票记录
  await prisma.topic_votes.createMany({
    data: [
      { id: `topic_vote_${Date.now()}_1`, topicId: topics[0].id, userId: users[0].id, direction: 'up' },
      { id: `topic_vote_${Date.now()}_2`, topicId: topics[0].id, userId: users[1].id, direction: 'up' },
      { id: `topic_vote_${Date.now()}_3`, topicId: topics[0].id, userId: users[2].id, direction: 'down' },
      { id: `topic_vote_${Date.now()}_4`, topicId: topics[1].id, userId: users[0].id, direction: 'up' },
      { id: `topic_vote_${Date.now()}_5`, topicId: topics[2].id, userId: admin.id, direction: 'up' },
    ],
  })

  console.log('✅ 创建热榜投票记录')

  console.log('🎉 数据库播种完成！')
  console.log('')
  console.log('📝 测试账号信息:')
  console.log('   管理员: admin@example.com / admin123')
  console.log('   普通用户: user@example.com / user123')
  console.log('')
  console.log('📊 数据统计:')
  console.log(`   用户: ${users.length + 1} 个`)
  console.log(`   文章: ${posts.length} 篇`)
  console.log(`   产品: ${products.length} 个`)
}

main()
  .catch((e) => {
    console.error('❌ 播种失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
