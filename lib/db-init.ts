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
 * Check if any admin user exists
 * Used to determine if initialization is needed
 */
export async function hasAdminUser(): Promise<boolean> {
  const prisma = getPrismaClient()
  try {
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

export default {
  getDatabaseType,
  hasAdminUser,
  hasAnyUser,
  isDatabaseConnected,
  getDefaultAdminConfig,
  createFirstAdmin,
}