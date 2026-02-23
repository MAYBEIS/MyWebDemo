# SysLog - 全栈博客简历项目
2026年2月18日 20:42:01
一个现代化的全栈博客简历应用，基于 Next.js 16 + React 19 + Prisma 构建。

## 🚀 技术栈

### 前端
- **框架**: Next.js 16.1.6 (App Router)
- **UI 库**: React 19.2.4
- **语言**: TypeScript 5.7.3
- **样式**: Tailwind CSS 4.x
- **组件**: Radix UI + shadcn/ui
- **图标**: Lucide React
- **表单**: react-hook-form + zod
- **主题**: next-themes

### 后端
- **数据库 ORM**: Prisma 6.x
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **认证**: JWT (jose)
- **密码哈希**: bcryptjs

## 📁 项目结构

```
blog-resume-frontend/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── auth/          # 认证相关 API
│   │   │   ├── login/     # 登录
│   │   │   ├── register/  # 注册
│   │   │   ├── logout/    # 登出
│   │   │   └── me/        # 获取当前用户
│   │   ├── posts/         # 文章 API
│   │   └── guestbook/     # 留言板 API
│   ├── blog/              # 博客页面
│   ├── about/             # 关于页面
│   ├── projects/          # 项目展示
│   ├── guestbook/         # 留言板
│   ├── login/             # 登录页面
│   ├── profile/           # 用户资料
│   ├── quiz/              # 每日测验
│   └── trending/          # 热门话题
├── components/            # React 组件
│   ├── ui/               # 基础 UI 组件
│   └── *.tsx             # 业务组件
├── lib/                   # 服务层
│   ├── prisma.ts         # Prisma 客户端
│   ├── auth-service.ts   # 认证服务
│   ├── posts-service.ts  # 文章服务
│   └── guestbook-service.ts # 留言板服务
├── prisma/               # 数据库
│   ├── schema.prisma     # 数据模型
│   └── seed.ts           # 种子数据
└── hooks/                # 自定义 Hooks
```

## 🛠 快速开始

### 1. 安装依赖

```bash
cd blog-resume-frontend
npm install
```

### 2. 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，设置必要的配置
```

### 3. 初始化数据库

```bash
# 生成 Prisma 客户端
npm run db:generate

# 同步数据库结构
npm run db:push

# 填充种子数据
npm run db:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 📝 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@example.com | admin123 |
| 普通用户 | user@example.com | user123 |

## 🔌 API 接口

### 认证 API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/me` | 获取当前用户 |

### 文章 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/posts` | 获取文章列表 |
| POST | `/api/posts` | 创建文章 (需认证) |
| GET | `/api/posts/[slug]` | 获取文章详情 |
| PUT | `/api/posts/[slug]` | 更新文章 (需认证) |
| DELETE | `/api/posts/[slug]` | 删除文章 (需认证) |

### 留言板 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/guestbook` | 获取留言列表 |
| POST | `/api/guestbook` | 创建留言 (需登录) |

## 🚀 生产部署

### Vercel 部署

1. 将项目推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量：
   - `DATABASE_URL`: PostgreSQL 连接字符串
   - `JWT_SECRET`: 强随机字符串 (至少32字符)
4. 部署

### PostgreSQL 配置

生产环境推荐使用 PostgreSQL：

```env
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

修改 `prisma/schema.prisma`：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 安全建议

1. **JWT 密钥**: 使用强随机字符串
   ```bash
   openssl rand -base64 32
   ```

2. **数据库备份**: 定期备份数据库

3. **HTTPS**: 生产环境必须使用 HTTPS

4. **环境变量**: 不要将 `.env` 文件提交到版本控制

## 📜 可用脚本

| 脚本 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint |
| `npm run db:generate` | 生成 Prisma 客户端 |
| `npm run db:push` | 同步数据库结构 |
| `npm run db:migrate` | 运行数据库迁移 |
| `npm run db:studio` | 打开 Prisma Studio |
| `npm run db:seed` | 填充种子数据 |

## 📄 许可证

MIT License
