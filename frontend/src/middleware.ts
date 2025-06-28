import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequestWithAuth } from "next-auth/middleware"

export default withAuth(
  async function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl
    
    // Skip token validation for auth pages and initial login process
    if (pathname.startsWith('/auth/') || pathname === '/' || pathname.startsWith('/api/')) {
      return NextResponse.next()
    }

    // Skip token validation in middleware - it will be handled by the session validator hook

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access if there's a valid token
        if (token) return true
        
        // Check if the request is for a protected route
        const { pathname } = req.nextUrl
        
        // Allow access to auth pages and public routes
        if (pathname.startsWith('/auth/') || 
            pathname === '/' ||
            pathname.startsWith('/api/') ||
            pathname.startsWith('/_next/') ||
            pathname === '/favicon.ico') {
          return true
        }
        
        // Require authentication for all other routes
        return false
      }
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (public static assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
  ]
}