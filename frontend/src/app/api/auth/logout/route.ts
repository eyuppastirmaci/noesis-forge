import { NextRequest, NextResponse } from 'next/server'
import { ENV } from '@/config/env'

export async function POST(req: NextRequest) {
  try {
    // Get refresh token from cookies
    const refreshToken = req.cookies.get('refresh_token')?.value

    // Call backend logout if refresh token exists
    if (refreshToken) {
      try {
        await fetch(`${ENV.API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        })
      } catch (error) {
        console.warn('Failed to call backend logout:', error)
        // Continue with clearing cookies even if backend call fails
      }
    }

    // Create response and clear auth cookies
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    )

    // Clear all auth-related cookies
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    response.cookies.delete('next-auth.session-token')
    response.cookies.delete('__Secure-next-auth.session-token')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    )
  }
} 