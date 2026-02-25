/**
 * Setup API
 * Create first administrator account
 */

import { NextRequest, NextResponse } from 'next/server'
import { hasAdminUser, createFirstAdmin, getDefaultAdminConfig } from '@/lib/db-init'

/**
 * GET - Get setup status
 */
export async function GET() {
  try {
    const needsSetup = !(await hasAdminUser())
    const defaultConfig = getDefaultAdminConfig()

    return NextResponse.json({
      needsSetup,
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

/**
 * POST - Create first administrator
 */
export async function POST(request: NextRequest) {
  try {
    // Check if setup is needed
    const hasAdmin = await hasAdminUser()
    if (hasAdmin) {
      return NextResponse.json(
        { error: 'Administrator already exists. Setup is not needed.' },
        { status: 400 }
      )
    }

    // Get form data
    const body = await request.json()
    const { email, password, name } = body

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Validate name length
    if (name.length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Create first admin
    const result = await createFirstAdmin(email, password, name)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        userId: result.userId,
      })
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error during setup:', error)
    return NextResponse.json(
      { error: 'Setup failed' },
      { status: 500 }
    )
  }
}