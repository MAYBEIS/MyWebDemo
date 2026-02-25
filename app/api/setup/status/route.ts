/**
 * Setup status API
 * Check if system needs initialization (no admin user exists)
 * 返回详细的系统初始化状态，用于流程引导式初始化
 */

import { NextResponse } from 'next/server'
import { 
  hasAdminUser, 
  hasAnyUser, 
  getDatabaseType, 
  isDatabaseConnected,
  getDefaultAdminConfig,
  checkTablesExist
} from '@/lib/db-init'

export async function GET() {
  try {
    // 并行获取所有状态信息
    const [dbConnected, dbType, defaultConfig, tablesExist] = await Promise.all([
      isDatabaseConnected(),
      Promise.resolve(getDatabaseType()),
      Promise.resolve(getDefaultAdminConfig()),
      checkTablesExist(),
    ])

    // 如果表不存在，不需要检查管理员
    let hasAdmin = false
    let hasUsers = false
    
    if (tablesExist.allTablesExist) {
      hasAdmin = await hasAdminUser()
      hasUsers = await hasAnyUser()
    }

    // 确定初始化阶段
    let setupPhase: 'database' | 'migration' | 'admin' | 'complete'
    
    if (!dbConnected) {
      setupPhase = 'database'  // 需要配置数据库连接
    } else if (!tablesExist.allTablesExist) {
      setupPhase = 'migration'  // 需要执行数据库迁移
    } else if (!hasAdmin) {
      setupPhase = 'admin'  // 需要创建管理员账号
    } else {
      setupPhase = 'complete'  // 系统已完成初始化
    }

    return NextResponse.json({
      // 基础状态
      setupPhase,
      needsSetup: setupPhase !== 'complete',
      
      // 数据库状态
      dbConnected,
      dbType,
      
      // 表状态
      tablesExist,
      needsMigration: !tablesExist.allTablesExist,
      
      // 用户状态
      hasAdmin,
      hasUsers,
      
      // 默认配置
      defaultEmail: defaultConfig.email || undefined,
      defaultName: defaultConfig.name || undefined,
      hasDefaultPassword: !!defaultConfig.password,
    })
  } catch (error) {
    console.error('Error checking setup status:', error)
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    )
  }
}