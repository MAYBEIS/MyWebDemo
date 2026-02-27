/**
 * Database migration API
 * Execute database migration using Prisma raw SQL
 * This is the preferred method for production environments
 */

import { NextResponse } from 'next/server'
import { 
  checkTablesExist, 
  isDatabaseConnected, 
  getDatabaseType,
  runMigration 
} from '@/lib/db-init'

/**
 * GET - Check migration status
 */
export async function GET() {
  try {
    const [dbConnected, tablesExist, dbType] = await Promise.all([
      isDatabaseConnected(),
      checkTablesExist(),
      Promise.resolve(getDatabaseType()),
    ])

    return NextResponse.json({
      dbConnected,
      dbType,
      tablesExist,
      needsMigration: !tablesExist.allTablesExist,
    })
  } catch (error) {
    console.error('Error checking migration status:', error)
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    )
  }
}

/**
 * POST - Execute database migration
 * Uses Prisma raw SQL to create tables
 */
export async function POST() {
  try {
    // Check database connection
    const dbConnected = await isDatabaseConnected()
    if (!dbConnected) {
      return NextResponse.json(
        { error: 'Database connection failed, please check DATABASE_URL configuration' },
        { status: 400 }
      )
    }

    // Execute migration using Prisma raw SQL
    console.log('[Migration API] Starting database migration...')
    
    const result = await runMigration()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        skipped: result.skipped || false,
        tablesExist: result.tablesExist,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.message,
        details: result.error,
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error during migration:', error)
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
