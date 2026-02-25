/**
 * 数据库迁移 API
 * 用于执行 Prisma 数据库迁移，创建所需的表结构
 */

import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { checkTablesExist, isDatabaseConnected, getDatabaseType } from '@/lib/db-init'

const execAsync = promisify(exec)

/**
 * GET - 检查迁移状态
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
 * POST - 执行数据库迁移
 * 运行 prisma db push 来创建表结构
 */
export async function POST() {
  try {
    // 检查数据库连接
    const dbConnected = await isDatabaseConnected()
    if (!dbConnected) {
      return NextResponse.json(
        { error: '数据库连接失败，请检查 DATABASE_URL 配置' },
        { status: 400 }
      )
    }

    // 检查是否需要迁移
    const tablesExist = await checkTablesExist()
    if (tablesExist.allTablesExist) {
      return NextResponse.json({
        success: true,
        message: '数据库表已存在，无需迁移',
        skipped: true,
      })
    }

    // 执行 prisma db push
    console.log('[Migration] Starting database migration...')
    
    try {
      const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss', {
        timeout: 120000, // 2分钟超时
        env: {
          ...process.env,
          NODE_ENV: 'production', // 确保使用生产环境配置
        },
      })

      console.log('[Migration] stdout:', stdout)
      if (stderr) {
        console.log('[Migration] stderr:', stderr)
      }

      // 验证迁移结果
      const newTablesExist = await checkTablesExist()
      
      if (newTablesExist.allTablesExist) {
        return NextResponse.json({
          success: true,
          message: '数据库迁移成功！表结构已创建',
          output: stdout,
          tablesExist: newTablesExist,
        })
      } else {
        return NextResponse.json({
          success: false,
          error: '迁移执行完成，但部分表未创建成功',
          tablesExist: newTablesExist,
          output: stdout,
          stderr: stderr,
        }, { status: 500 })
      }
    } catch (execError) {
      console.error('[Migration] Execution error:', execError)
      
      const errorMessage = execError instanceof Error ? execError.message : 'Unknown error'
      
      return NextResponse.json({
        success: false,
        error: `数据库迁移失败: ${errorMessage}`,
        details: errorMessage,
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error during migration:', error)
    return NextResponse.json(
      { error: '迁移过程中发生错误' },
      { status: 500 }
    )
  }
}
