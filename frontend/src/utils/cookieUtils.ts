/**
 * Get the value of a cookie by name
 * @param name Cookie name
 * @returns Cookie value or null if not found or in SSR
 */
export function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=')
    if (cookieName === name) {
      return decodeURIComponent(cookieValue)
    }
  }
  return null
}

/**
 * Set a cookie with specified options
 * @param name Cookie name
 * @param value Cookie value
 * @param options Cookie options
 */
export function setCookie(
  name: string, 
  value: string, 
  options: {
    maxAge?: number
    expires?: Date
    path?: string
    domain?: string
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
  } = {}
): void {
  if (typeof document === 'undefined') return

  const {
    maxAge,
    expires,
    path = '/',
    domain,
    secure = location.protocol === 'https:',
    sameSite = 'lax'
  } = options

  let cookieString = `${name}=${encodeURIComponent(value)}`
  
  if (maxAge !== undefined) {
    cookieString += `; max-age=${maxAge}`
  }
  
  if (expires) {
    cookieString += `; expires=${expires.toUTCString()}`
  }
  
  cookieString += `; path=${path}`
  
  if (domain) {
    cookieString += `; domain=${domain}`
  }
  
  if (secure) {
    cookieString += `; secure`
  }
  
  cookieString += `; samesite=${sameSite}`

  document.cookie = cookieString
}

/**
 * Delete a cookie by setting its expiration to the past
 * @param name Cookie name
 * @param options Cookie options (path and domain should match the original cookie)
 */
export function deleteCookie(
  name: string, 
  options: {
    path?: string
    domain?: string
  } = {}
): void {
  if (typeof document === 'undefined') return

  const { path = '/', domain } = options
  
  let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`
  
  if (domain) {
    cookieString += `; domain=${domain}`
  }

  document.cookie = cookieString
}

/**
 * Clear all auth-related cookies
 */
export function clearAuthCookies(): void {
  deleteCookie('access_token')
  deleteCookie('refresh_token')
  deleteCookie('login_time')
  deleteCookie('next-auth.session-token')
  deleteCookie('__Secure-next-auth.session-token')
}

/**
 * Set auth tokens in cookies
 * @param tokens Auth tokens object
 */
export function setAuthTokens(tokens: {
  accessToken: string
  refreshToken: string
  expiresIn: number
}): void {
  // Set login time to prevent immediate token validation
  setCookie('login_time', Date.now().toString(), { maxAge: 10 })
  
  // Set access token cookie
  setCookie('access_token', tokens.accessToken, { 
    maxAge: tokens.expiresIn 
  })
  
  // Set refresh token cookie (7 days)
  const refreshMaxAge = 7 * 24 * 60 * 60 // 7 days in seconds
  setCookie('refresh_token', tokens.refreshToken, { 
    maxAge: refreshMaxAge 
  })
} 