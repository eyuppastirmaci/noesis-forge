import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequestWithAuth } from "next-auth/middleware"

export default withAuth(
  async function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Auth pages that should redirect to dashboard if user is already logged in
    const authPages = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/register-success']
    const isAuthPage = authPages.some(page => pathname.startsWith(page))

    // If user is authenticated and tries to access auth pages, redirect to dashboard
    if (token && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // If user is authenticated and on root, redirect to dashboard
    if (token && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow access to static files and API routes
        if (pathname.startsWith('/api/') ||
            pathname.startsWith('/_next/') ||
            pathname === '/favicon.ico' ||
            pathname.startsWith('/assets/')) {
          return true
        }
        
        // Protected routes require authentication
        const protectedPaths = ['/dashboard', '/documents', '/profile', '/settings']
        const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
        
        if (isProtectedPath && !token) {
          return false // Will redirect to login page
        }
        
        // For all other routes (including /auth/* and /), let middleware handle the logic
        return true
      }
    },
    pages: {
      signIn: '/auth/login', // Redirect unauthenticated users here
    }
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