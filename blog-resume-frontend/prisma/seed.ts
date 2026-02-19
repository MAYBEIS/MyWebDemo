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
  await prisma.comments.deleteMany()
  await prisma.post_tags.deleteMany()
  await prisma.posts.deleteMany()
  await prisma.guestbooks.deleteMany()
  await prisma.sessions.deleteMany()
  await prisma.users.deleteMany()

  console.log('✅ 清理完成')

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
  const user = await prisma.users.create({
    data: {
      id: `user_${Date.now()}_user`,
      email: 'user@example.com',
      name: '普通用户',
      password: hashedUserPassword,
      isAdmin: false,
      avatar: 'PT',
      bio: '热爱编程的开发者',
      updatedAt: new Date(),
    },
  })
  console.log('✅ 创建普通用户:', user.email)

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
  ])

  console.log('✅ 创建示例文章:', posts.length, '篇')

  // 创建示例留言
  await prisma.guestbooks.createMany({
    data: [
      {
        id: `guestbook_${Date.now()}_1`,
        message: '很棒的博客！内容很有深度，学到了很多。',
        authorId: user.id,
        updatedAt: new Date(),
      },
      {
        id: `guestbook_${Date.now()}_2`,
        message: '期待更多关于系统编程的文章！',
        authorId: user.id,
        updatedAt: new Date(),
      },
    ],
  })

  console.log('✅ 创建示例留言')

  console.log('🎉 数据库播种完成！')
  console.log('')
  console.log('📝 测试账号信息:')
  console.log('   管理员: admin@example.com / admin123')
  console.log('   用户: user@example.com / user123')
}

main()
  .catch((e) => {
    console.error('❌ 播种失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
