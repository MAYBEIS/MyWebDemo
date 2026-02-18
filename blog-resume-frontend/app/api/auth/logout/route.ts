import { NextResponse } from 'next/server'

/**
 * POST /api/auth/logout
 * 1. Clear auth cookie
 * 2. Return success response
 */
export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  })

  // Clear the auth cookie by setting it to expire immediately
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
}