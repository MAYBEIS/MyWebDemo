/**
 * Database initialization utilities
 * Used to check if database needs initialization and create first admin account
 * Supports both SQLite and PostgreSQL
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Initialize Prisma client
function getPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  })
}

/**
 * Detect database type from DATABASE_URL
 */
export function getDatabaseType(): 'sqlite' | 'postgresql' {
  const url = process.env.DATABASE_URL || ''
  if (url.startsWith('file:') || url.includes('.db')) {
    return 'sqlite'
  }
  return 'postgresql'
}

/**
 * 检查数据库表是否存在
 * 用于判断是否需要执行数据库迁移
 */
export async function checkTablesExist(): Promise<{ 
  users: boolean
  posts: boolean
  comments: boolean
  system_settings: boolean
  allTablesExist: boolean
}> {
  const prisma = getPrismaClient()
  const dbType = getDatabaseType()
  
  try {
    let usersExist = false
    let postsExist = false
    let commentsExist = false
    let settingsExist = false
    
    if (dbType === 'postgresql') {
      // PostgreSQL: 查询 information_schema 检查表是否存在
      const result = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'posts', 'comments', 'system_settings')
      `
      const tableNames = result.map(r => r.table_name)
      usersExist = tableNames.includes('users')
      postsExist = tableNames.includes('posts')
      commentsExist = tableNames.includes('comments')
      settingsExist = tableNames.includes('system_settings')
    } else {
      // SQLite: 查询 sqlite_master 检查表是否存在
      const result = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name IN ('users', 'posts', 'comments', 'system_settings')
      `
      const tableNames = result.map(r => r.name)
      usersExist = tableNames.includes('users')
      postsExist = tableNames.includes('posts')
      commentsExist = tableNames.includes('comments')
      settingsExist = tableNames.includes('system_settings')
    }
    
    return {
      users: usersExist,
      posts: postsExist,
      comments: commentsExist,
      system_settings: settingsExist,
      allTablesExist: usersExist && postsExist && commentsExist && settingsExist,
    }
  } catch (error) {
    console.error('Error checking tables exist:', error)
    return {
      users: false,
      posts: false,
      comments: false,
      system_settings: false,
      allTablesExist: false,
    }
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Check if any admin user exists
 * Used to determine if initialization is needed
 */
export async function hasAdminUser(): Promise<boolean> {
  const prisma = getPrismaClient()
  try {
    // 先检查表是否存在
    const tablesExist = await checkTablesExist()
    if (!tablesExist.users) {
      return false
    }
    
    const adminCount = await prisma.users.count({
      where: { isAdmin: true }
    })
    return adminCount > 0
  } catch (error) {
    console.error('Error checking admin user:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Check if any user exists
 */
export async function hasAnyUser(): Promise<boolean> {
  const prisma = getPrismaClient()
  try {
    // 先检查表是否存在
    const tablesExist = await checkTablesExist()
    if (!tablesExist.users) {
      return false
    }
    
    const userCount = await prisma.users.count()
    return userCount > 0
  } catch (error) {
    console.error('Error checking users:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Check if database is connected and accessible
 */
export async function isDatabaseConnected(): Promise<boolean> {
  const prisma = getPrismaClient()
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection error:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Get default administrator account configuration from environment variables
 * Used as default values in initialization form
 */
export function getDefaultAdminConfig() {
  return {
    email: process.env.DEFAULT_ADMIN_EMAIL || '',
    password: process.env.DEFAULT_ADMIN_PASSWORD || '',
    name: process.env.DEFAULT_ADMIN_NAME || '',
  }
}

/**
 * Create the first administrator account
 * Only works when no admin exists
 */
export async function createFirstAdmin(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; message: string; userId?: string }> {
  const prisma = getPrismaClient()
  
  try {
    // Check if admin already exists
    const hasAdmin = await hasAdminUser()
    if (hasAdmin) {
      return {
        success: false,
        message: 'Administrator account already exists',
      }
    }

    // Check if email is already taken
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      return {
        success: false,
        message: 'Email is already registered',
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate user ID
    const userId = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Create admin user
    const user = await prisma.users.create({
      data: {
        id: userId,
        email,
        name,
        password: hashedPassword,
        isAdmin: true,
        avatar: name.slice(0, 2).toUpperCase(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    console.log(`[DB Init] First administrator created: ${user.email}`)

    // Create default system settings if not exist
    await createDefaultSettings(prisma)

    return {
      success: true,
      message: 'Administrator account created successfully',
      userId: user.id,
    }
  } catch (error) {
    console.error('Error creating first admin:', error)
    return {
      success: false,
      message: `Failed to create administrator: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Create default system settings
 */
async function createDefaultSettings(prisma: PrismaClient) {
  const defaultSettings = [
    { key: 'site_name', value: 'SysLog', description: 'Website name' },
    { key: 'site_description', value: 'A modern blog and resume system', description: 'Website description' },
    { key: 'comment_enabled', value: 'true', description: 'Enable comment feature' },
    { key: 'comment_max_depth', value: '3', description: 'Maximum nesting depth for comments' },
    { key: 'shop_enabled', value: 'true', description: 'Enable shop feature' },
    { key: 'db_initialized', value: 'true', description: 'Database initialization flag' },
    { key: 'initialized_at', value: new Date().toISOString(), description: 'Database initialization time' },
  ]

  for (const setting of defaultSettings) {
    await prisma.system_settings.upsert({
      where: { key: setting.key },
      create: {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        ...setting,
      },
      update: { value: setting.value },
    })
  }
}

/**
 * PostgreSQL: Create all tables using raw SQL
 * This is used when tables don't exist and we need to initialize the database
 */
export async function createTablesPostgres(prisma: PrismaClient): Promise<{ success: boolean; error?: string }> {
  try {
    // Create users table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "isAdmin" BOOLEAN NOT NULL DEFAULT false,
        "isBanned" BOOLEAN NOT NULL DEFAULT false,
        "bannedReason" TEXT,
        "bannedAt" TIMESTAMP(3),
        "avatar" TEXT,
        "bio" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      )
    `)
    
    // Create unique index on email
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")
    `)
    
    // Create index on isBanned
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "users_isBanned_idx" ON "users"("isBanned")
    `)

    // Create sessions table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_key" ON "sessions"("token")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions"("token")`)

    // Create posts table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "posts" (
        "id" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "excerpt" TEXT,
        "category" TEXT,
        "coverImage" TEXT,
        "published" BOOLEAN NOT NULL DEFAULT false,
        "views" INTEGER NOT NULL DEFAULT 0,
        "likes" INTEGER NOT NULL DEFAULT 0,
        "authorId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "posts_slug_key" ON "posts"("slug")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "posts_createdAt_idx" ON "posts"("createdAt")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "posts_published_idx" ON "posts"("published")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "posts_category_idx" ON "posts"("category")`)

    // Create post_tags table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "post_tags" (
        "id" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        "tag" TEXT NOT NULL,
        CONSTRAINT "post_tags_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "post_tags_postId_tag_key" ON "post_tags"("postId", "tag")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_tags_tag_idx" ON "post_tags"("tag")`)

    // Create comments table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "comments" (
        "id" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        "authorId" TEXT NOT NULL,
        "parentId" TEXT,
        "likes" INTEGER NOT NULL DEFAULT 0,
        "isRecalled" BOOLEAN NOT NULL DEFAULT false,
        "recalledAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "comments_authorId_idx" ON "comments"("authorId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "comments_postId_idx" ON "comments"("postId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "comments_isRecalled_idx" ON "comments"("isRecalled")`)

    // Create comment_likes table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "comment_likes" (
        "id" TEXT NOT NULL,
        "commentId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "comment_likes_commentId_userId_key" ON "comment_likes"("commentId", "userId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "comment_likes_commentId_idx" ON "comment_likes"("commentId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "comment_likes_userId_idx" ON "comment_likes"("userId")`)

    // Create post_likes table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "post_likes" (
        "id" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "post_likes_postId_userId_key" ON "post_likes"("postId", "userId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_likes_postId_idx" ON "post_likes"("postId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_likes_userId_idx" ON "post_likes"("userId")`)

    // Create post_bookmarks table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "post_bookmarks" (
        "id" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "post_bookmarks_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "post_bookmarks_postId_userId_key" ON "post_bookmarks"("postId", "userId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_bookmarks_postId_idx" ON "post_bookmarks"("postId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_bookmarks_userId_idx" ON "post_bookmarks"("userId")`)

    // Create guestbooks table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "guestbooks" (
        "id" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "authorId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "guestbooks_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "guestbooks_createdAt_idx" ON "guestbooks"("createdAt")`)

    // Create system_settings table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings"("key")`)

    // Create products table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "type" TEXT NOT NULL,
        "duration" INTEGER,
        "features" TEXT,
        "image" TEXT,
        "stock" INTEGER NOT NULL DEFAULT -1,
        "status" BOOLEAN NOT NULL DEFAULT true,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "products_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "products_type_idx" ON "products"("type")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products"("status")`)

    // Create product_keys table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "product_keys" (
        "id" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'available',
        "orderId" TEXT,
        "userId" TEXT,
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "usedAt" TIMESTAMP(3),
        CONSTRAINT "product_keys_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "product_keys_key_key" ON "product_keys"("key")`)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "product_keys_orderId_key" ON "product_keys"("orderId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "product_keys_productId_idx" ON "product_keys"("productId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "product_keys_status_idx" ON "product_keys"("status")`)

    // Create orders table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" TEXT NOT NULL,
        "orderNo" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "productKey" TEXT,
        "amount" DOUBLE PRECISION NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "paymentMethod" TEXT,
        "paymentTime" TIMESTAMP(3),
        "remark" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "orders_orderNo_key" ON "orders"("orderNo")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_userId_idx" ON "orders"("userId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt")`)

    // Create user_memberships table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_memberships" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3) NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "user_memberships_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "user_memberships_userId_key" ON "user_memberships"("userId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "user_memberships_userId_idx" ON "user_memberships"("userId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "user_memberships_active_idx" ON "user_memberships"("active")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "user_memberships_endDate_idx" ON "user_memberships"("endDate")`)

    // Create payment_channels table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "payment_channels" (
        "id" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "enabled" BOOLEAN NOT NULL DEFAULT false,
        "config" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "payment_channels_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "payment_channels_code_key" ON "payment_channels"("code")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "payment_channels_code_idx" ON "payment_channels"("code")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "payment_channels_enabled_idx" ON "payment_channels"("enabled")`)

    // Create coupons table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "value" DOUBLE PRECISION NOT NULL,
        "minAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "maxDiscount" DOUBLE PRECISION,
        "totalCount" INTEGER NOT NULL DEFAULT -1,
        "usedCount" INTEGER NOT NULL DEFAULT 0,
        "startTime" TIMESTAMP(3) NOT NULL,
        "endTime" TIMESTAMP(3) NOT NULL,
        "status" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key" ON "coupons"("code")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "coupons_code_idx" ON "coupons"("code")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "coupons_status_idx" ON "coupons"("status")`)

    // Create user_coupons table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_coupons" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "couponId" TEXT NOT NULL,
        "orderId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'unused',
        "usedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "user_coupons_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "user_coupons_userId_couponId_key" ON "user_coupons"("userId", "couponId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "user_coupons_userId_idx" ON "user_coupons"("userId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "user_coupons_status_idx" ON "user_coupons"("status")`)

    // Add foreign key constraints
    // Note: We do this after all tables are created to avoid circular dependency issues
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" 
        FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_postId_fkey" 
        FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" 
        FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" 
        FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" 
        FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_commentId_fkey" 
        FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_postId_fkey" 
        FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "post_bookmarks" ADD CONSTRAINT "post_bookmarks_postId_fkey" 
        FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "post_bookmarks" ADD CONSTRAINT "post_bookmarks_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "guestbooks" ADD CONSTRAINT "guestbooks_authorId_fkey" 
        FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "product_keys" ADD CONSTRAINT "product_keys_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "product_keys" ADD CONSTRAINT "product_keys_orderId_fkey" 
        FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "product_keys" ADD CONSTRAINT "product_keys_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "orders" ADD CONSTRAINT "orders_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_couponId_fkey" 
        FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `)

    console.log('[DB Init] All PostgreSQL tables created successfully')
    return { success: true }
  } catch (error) {
    console.error('[DB Init] Error creating PostgreSQL tables:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * SQLite: Create all tables using raw SQL
 */
export async function createTablesSqlite(prisma: PrismaClient): Promise<{ success: boolean; error?: string }> {
  try {
    // SQLite uses slightly different syntax
    // Create users table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "isAdmin" INTEGER NOT NULL DEFAULT 0,
        "isBanned" INTEGER NOT NULL DEFAULT 0,
        "bannedReason" TEXT,
        "bannedAt" DATETIME,
        "avatar" TEXT,
        "bio" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `)

    // Create sessions table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "expiresAt" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId")`)

    // Create posts table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "posts" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "slug" TEXT NOT NULL UNIQUE,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "excerpt" TEXT,
        "category" TEXT,
        "coverImage" TEXT,
        "published" INTEGER NOT NULL DEFAULT 0,
        "views" INTEGER NOT NULL DEFAULT 0,
        "likes" INTEGER NOT NULL DEFAULT 0,
        "authorId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "posts_createdAt_idx" ON "posts"("createdAt")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "posts_published_idx" ON "posts"("published")`)

    // Create post_tags table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "post_tags" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "postId" TEXT NOT NULL,
        "tag" TEXT NOT NULL,
        UNIQUE("postId", "tag")
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "post_tags_tag_idx" ON "post_tags"("tag")`)

    // Create comments table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "comments" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "content" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        "authorId" TEXT NOT NULL,
        "parentId" TEXT,
        "likes" INTEGER NOT NULL DEFAULT 0,
        "isRecalled" INTEGER NOT NULL DEFAULT 0,
        "recalledAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "comments_authorId_idx" ON "comments"("authorId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "comments_postId_idx" ON "comments"("postId")`)

    // Create comment_likes table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "comment_likes" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "commentId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("commentId", "userId")
      )
    `)

    // Create post_likes table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "post_likes" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "postId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("postId", "userId")
      )
    `)

    // Create post_bookmarks table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "post_bookmarks" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "postId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("postId", "userId")
      )
    `)

    // Create guestbooks table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "guestbooks" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "message" TEXT NOT NULL,
        "authorId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "guestbooks_createdAt_idx" ON "guestbooks"("createdAt")`)

    // Create system_settings table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "key" TEXT NOT NULL UNIQUE,
        "value" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `)

    // Create products table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "price" REAL NOT NULL,
        "type" TEXT NOT NULL,
        "duration" INTEGER,
        "features" TEXT,
        "image" TEXT,
        "stock" INTEGER NOT NULL DEFAULT -1,
        "status" INTEGER NOT NULL DEFAULT 1,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "products_type_idx" ON "products"("type")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products"("status")`)

    // Create product_keys table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "product_keys" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "productId" TEXT NOT NULL,
        "key" TEXT NOT NULL UNIQUE,
        "status" TEXT NOT NULL DEFAULT 'available',
        "orderId" TEXT UNIQUE,
        "userId" TEXT,
        "expiresAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "usedAt" DATETIME
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "product_keys_productId_idx" ON "product_keys"("productId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "product_keys_status_idx" ON "product_keys"("status")`)

    // Create orders table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderNo" TEXT NOT NULL UNIQUE,
        "userId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "productKey" TEXT,
        "amount" REAL NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "paymentMethod" TEXT,
        "paymentTime" DATETIME,
        "remark" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_userId_idx" ON "orders"("userId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt")`)

    // Create user_memberships table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_memberships" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "type" TEXT NOT NULL,
        "startDate" DATETIME NOT NULL,
        "endDate" DATETIME NOT NULL,
        "active" INTEGER NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "user_memberships_active_idx" ON "user_memberships"("active")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "user_memberships_endDate_idx" ON "user_memberships"("endDate")`)

    // Create payment_channels table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "payment_channels" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "enabled" INTEGER NOT NULL DEFAULT 0,
        "config" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "payment_channels_enabled_idx" ON "payment_channels"("enabled")`)

    // Create coupons table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "value" REAL NOT NULL,
        "minAmount" REAL NOT NULL DEFAULT 0,
        "maxDiscount" REAL,
        "totalCount" INTEGER NOT NULL DEFAULT -1,
        "usedCount" INTEGER NOT NULL DEFAULT 0,
        "startTime" DATETIME NOT NULL,
        "endTime" DATETIME NOT NULL,
        "status" INTEGER NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "coupons_status_idx" ON "coupons"("status")`)

    // Create user_coupons table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_coupons" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "couponId" TEXT NOT NULL,
        "orderId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'unused',
        "usedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "couponId")
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "user_coupons_userId_idx" ON "user_coupons"("userId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "user_coupons_status_idx" ON "user_coupons"("status")`)

    console.log('[DB Init] All SQLite tables created successfully')
    return { success: true }
  } catch (error) {
    console.error('[DB Init] Error creating SQLite tables:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Execute database migration using Prisma raw SQL
 * This is the preferred method for production environments
 */
export async function runMigration(): Promise<{ 
  success: boolean; 
  message: string; 
  error?: string;
  skipped?: boolean;
  tablesExist?: Awaited<ReturnType<typeof checkTablesExist>>;
}> {
  const prisma = getPrismaClient()
  const dbType = getDatabaseType()
  
  try {
    // Check if tables already exist
    const tablesExist = await checkTablesExist()
    if (tablesExist.allTablesExist) {
      return {
        success: true,
        message: 'Database tables already exist, no migration needed',
        skipped: true,
      }
    }

    console.log(`[Migration] Starting ${dbType} migration...`)
    
    let result
    if (dbType === 'postgresql') {
      result = await createTablesPostgres(prisma)
    } else {
      result = await createTablesSqlite(prisma)
    }
    
    if (result.success) {
      // Verify tables were created
      const newTablesExist = await checkTablesExist()
      
      return {
        success: true,
        message: 'Database migration completed successfully',
        tablesExist: newTablesExist,
      }
    } else {
      return {
        success: false,
        message: 'Database migration failed',
        error: result.error,
      }
    }
  } catch (error) {
    console.error('[Migration] Error:', error)
    return {
      success: false,
      message: 'Migration failed with error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  } finally {
    await prisma.$disconnect()
  }
}

export default {
  getDatabaseType,
  checkTablesExist,
  hasAdminUser,
  hasAnyUser,
  isDatabaseConnected,
  getDefaultAdminConfig,
  createFirstAdmin,
  runMigration,
}