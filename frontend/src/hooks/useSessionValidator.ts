import { useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ENV } from '@/config/env'
import { getCookieValue, clearAuthCookies } from '@/utils'

const VALIDATION_INTERVAL = 10 * 60 * 1000 // 10 minutes

export function useSessionValidator() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastValidationRef = useRef<number>(0)

  const validateRefreshToken = async (): Promise<boolean> => {
    try {
      // Get refresh token from cookies
      const refreshToken = getCookieValue('refresh_token')
      if (!refreshToken) {
        console.warn('No refresh token found in cookies')
        return false
      }

      console.log('Validating refresh token:', refreshToken.substring(0, 8) + '...')
      
      const response = await fetch(`${ENV.API_URL}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('Refresh token validation failed:', response.status, errorText)
      }

      return response.ok
    } catch (error) {
      console.warn('Failed to validate refresh token:', error)
      return false
    }
  }

  const handleLogout = async () => {
    try {
      // Clear auth cookies using utility function
      clearAuthCookies()
      
      // Sign out from NextAuth
      await signOut({ 
        callbackUrl: '/auth/login',
        redirect: false 
      })
      
      // Redirect to login page
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect even if signOut fails
      router.push('/auth/login')
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && session) {
      // Check if this is a recent login to avoid immediate validation
      const loginTime = getCookieValue('login_time')
      const now = Date.now()
      
      if (loginTime && now - parseInt(loginTime) < 10000) {
        // If login was within last 10 seconds, delay validation start
        const delayTimer = setTimeout(() => {
          startValidation()
        }, 10000 - (now - parseInt(loginTime)))
        
        return () => {
          clearTimeout(delayTimer)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      } else {
        startValidation()
      }

      function startValidation() {
        intervalRef.current = setInterval(async () => {
          const now = Date.now()
          
          // Only validate if enough time has passed since last validation
          if (now - lastValidationRef.current >= VALIDATION_INTERVAL) {
            lastValidationRef.current = now
            
            const isValid = await validateRefreshToken()
            if (!isValid) {
              // Clear interval before logout
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
              }
              
              await handleLogout()
            }
          }
        }, VALIDATION_INTERVAL)

        // Also validate immediately on mount if it's been a while since last validation
        const now = Date.now()
        if (now - lastValidationRef.current >= VALIDATION_INTERVAL) {
          validateRefreshToken().then(isValid => {
            lastValidationRef.current = now
            if (!isValid) {
              handleLogout()
            }
          })
        }
      }
    }

    // Cleanup interval when session changes or component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [status, session, router])

  // Handle page visibility change to validate when user comes back
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && status === 'authenticated' && session) {
        const now = Date.now()
        
        // Validate if it's been more than 1 minute since last validation
        if (now - lastValidationRef.current >= 60 * 1000) {
          const isValid = await validateRefreshToken()
          lastValidationRef.current = now
          
          if (!isValid) {
            await handleLogout()
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [status, session])
}

 