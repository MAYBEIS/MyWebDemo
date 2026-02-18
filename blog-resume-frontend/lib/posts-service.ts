/**
 * 博客文章服务层
 * 处理文章的 CRUD 操作
 */

// 文章类型定义
export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  coverImage?: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  views?: number;
  likes?: number;
}

export interface CreatePostInput {
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  coverImage?: string;
  authorId: string;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  coverImage?: string;
  published?: boolean;
}

export interface GetPostsOptions {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  search?: string;
}

// 临时数据存储（生产环境应使用数据库）
let posts: Post[] = [
  {
    id: '1',
    slug: 'nextjs-app-router-introduction',
    title: 'Next.js App Router 完全指南',
    content: '# Next.js App Router 简介\n\nApp Router 是 Next.js 13 引入的新路由系统...',
    excerpt: '深入了解 Next.js App Router 的工作原理和最佳实践',
    category: '前端开发',
    tags: ['Next.js', 'React', '前端'],
    coverImage: '/images/blog/nextjs.jpg',
    authorId: '1',
    authorName: '管理员',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    published: true,
    views: 1250,
    likes: 89,
  },
  {
    id: '2',
    slug: 'typescript-best-practices',
    title: 'TypeScript 最佳实践',
    content: '# TypeScript 类型系统\n\nTypeScript 提供了强大的类型系统...',
    excerpt: '掌握 TypeScript 的核心概念和实用技巧',
    category: '编程语言',
    tags: ['TypeScript', 'JavaScript', '类型系统'],
    coverImage: '/images/blog/typescript.jpg',
    authorId: '1',
    authorName: '管理员',
    createdAt: '2024-01-20T14:30:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    published: true,
    views: 980,
    likes: 67,
  },
  {
    id: '3',
    slug: 'react-hooks-deep-dive',
    title: 'React Hooks 深度解析',
    content: '# useState 和 useEffect\n\nReact Hooks 改变了我们编写组件的方式...',
    excerpt: '全面理解 React Hooks 的工作机制和使用场景',
    category: '前端开发',
    tags: ['React', 'Hooks', '状态管理'],
    coverImage: '/images/blog/react.jpg',
    authorId: '1',
    authorName: '管理员',
    createdAt: '2024-02-01T09:15:00Z',
    updatedAt: '2024-02-01T09:15:00Z',
    published: true,
    views: 1567,
    likes: 123,
  },
];

/**
 * 获取文章列表
 */
export async function getPosts(options: GetPostsOptions = {}): Promise<{
  posts: Post[];
  total: number;
  page: number;
  limit: number;
}> {
  const {
    page = 1,
    limit = 10,
    category,
    tag,
    search,
  } = options;

  let filteredPosts = [...posts];

  // 按分类筛选
  if (category) {
    filteredPosts = filteredPosts.filter(post => post.category === category);
  }

  // 按标签筛选
  if (tag) {
    filteredPosts = filteredPosts.filter(post => 
      post.tags?.includes(tag)
    );
  }

  // 搜索筛选
  if (search) {
    const searchLower = search.toLowerCase();
    filteredPosts = filteredPosts.filter(post =>
      post.title.toLowerCase().includes(searchLower) ||
      post.excerpt?.toLowerCase().includes(searchLower) ||
      post.content.toLowerCase().includes(searchLower)
    );
  }

  // 只返回已发布的文章
  filteredPosts = filteredPosts.filter(post => post.published);

  // 按创建时间倒序排列
  filteredPosts.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // 分页
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

  return {
    posts: paginatedPosts,
    total: filteredPosts.length,
    page,
    limit,
  };
}

/**
 * 根据 slug 获取单篇文章
 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const post = posts.find(p => p.slug === slug);
  return post || null;
}

/**
 * 创建新文章
 */
export async function createPost(input: CreatePostInput): Promise<Post> {
  const newPost: Post = {
    id: Date.now().toString(),
    slug: generateSlug(input.title),
    title: input.title,
    content: input.content,
    excerpt: input.excerpt || generateExcerpt(input.content),
    category: input.category,
    tags: input.tags,
    coverImage: input.coverImage,
    authorId: input.authorId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    published: true,
    views: 0,
    likes: 0,
  };

  posts.unshift(newPost);
  return newPost;
}

/**
 * 更新文章
 */
export async function updatePost(
  slug: string,
  input: UpdatePostInput
): Promise<Post | null> {
  const postIndex = posts.findIndex(p => p.slug === slug);
  
  if (postIndex === -1) {
    return null;
  }

  const updatedPost: Post = {
    ...posts[postIndex],
    ...input,
    updatedAt: new Date().toISOString(),
  };

  // 如果标题改变，更新 slug
  if (input.title && input.title !== posts[postIndex].title) {
    updatedPost.slug = generateSlug(input.title);
  }

  posts[postIndex] = updatedPost;
  return updatedPost;
}

/**
 * 删除文章
 */
export async function deletePost(slug: string): Promise<boolean> {
  const postIndex = posts.findIndex(p => p.slug === slug);
  
  if (postIndex === -1) {
    return false;
  }

  posts.splice(postIndex, 1);
  return true;
}

/**
 * 增加文章浏览量
 */
export async function incrementViews(slug: string): Promise<void> {
  const post = posts.find(p => p.slug === slug);
  if (post) {
    post.views = (post.views || 0) + 1;
  }
}

/**
 * 增加文章点赞数
 */
export async function incrementLikes(slug: string): Promise<void> {
  const post = posts.find(p => p.slug === slug);
  if (post) {
    post.likes = (post.likes || 0) + 1;
  }
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
    .replace(/^-+|-+$/g, '');
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
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return plainText.substring(0, maxLength).trim() + '...';
}
