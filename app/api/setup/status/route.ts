/**
 * Setup status API
 * Check if system needs initialization (no admin user exists)
 */

import { NextResponse } from 'next/server'
import { hasAdminUser, hasAnyUser, isVercelPostgresEnabled, getDefaultAdminConfig } from '@/lib/db-init'

export async function GET() {
  try {
    const [hasAdmin, hasUsers, vercelEnabled, defaultConfig] = await Promise.all([
      hasAdminUser(),
      hasAnyUser(),
      Promise.resolve(isVercelPostgresEnabled()),
      Promise.resolve(getDefaultAdminConfig()),
    ])

    return NextResponse.json({
      needsSetup: !hasAdmin,
      hasUsers,
      vercelPostgresEnabled: vercelEnabled,
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