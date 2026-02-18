/**
 * 认证服务层
 * 处理用户认证、JWT 生成和验证
 */

import { SignJWT, jwtVerify } from 'jose';

// 用户类型定义
export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

// JWT 密钥（生产环境应从环境变量读取）
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// 临时用户数据存储（生产环境应使用数据库）
const users: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    name: '管理员',
    password: 'admin123', // 实际应用中应该使用哈希密码
    isAdmin: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'user@example.com',
    name: '普通用户',
    password: 'user123',
    isAdmin: false,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

/**
 * 验证用户凭据
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return null;
  }

  // 返回不包含密码的用户信息
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
  };
}

/**
 * 生成 JWT token
 */
export async function generateToken(user: AuthUser): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}

/**
 * 验证 JWT token
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    return {
      id: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      isAdmin: payload.isAdmin as boolean,
    };
  } catch (error) {
    console.error('Token 验证失败:', error);
    return null;
  }
}

/**
 * 从请求中获取当前用户
 */
export async function getCurrentUser(
  request: Request
): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyToken(token);
}

/**
 * 检查用户是否为管理员
 */
export async function isAdmin(request: Request): Promise<boolean> {
  const user = await getCurrentUser(request);
  return user?.isAdmin || false;
}

/**
 * 注册新用户
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<AuthUser | null> {
  // 检查邮箱是否已存在
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return null;
  }

  const newUser: User = {
    id: Date.now().toString(),
    email,
    name,
    password, // 实际应用中应该使用 bcrypt 等库进行哈希
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    isAdmin: newUser.isAdmin,
  };
}
