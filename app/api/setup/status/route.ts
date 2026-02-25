/**
 * Setup status API
 * Check if system needs initialization (no admin user exists)
 */

import { NextResponse } from 'next/server'
import { 
  hasAdminUser, 
  hasAnyUser, 
  getDatabaseType, 
  isDatabaseConnected,
  getDefaultAdminConfig 
} from '@/lib/db-init'

export async function GET() {
  try {
    const [hasAdmin, hasUsers, dbConnected, dbType, defaultConfig] = await Promise.all([
      hasAdminUser(),
      hasAnyUser(),
      isDatabaseConnected(),
      Promise.resolve(getDatabaseType()),
      Promise.resolve(getDefaultAdminConfig()),
    ])

    return NextResponse.json({
      needsSetup: !hasAdmin,
      hasUsers,
      dbConnected,
      dbType,
      // Provide default values for the setup form
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