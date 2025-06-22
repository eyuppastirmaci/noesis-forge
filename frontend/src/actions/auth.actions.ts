'use server'

import { authService } from '@/services/auth.service'
import { RegisterRequest, LoginRequest } from '@/types'
import { ApiClientError } from '@/types/api'

export interface RegisterState {
  errors: string[]
  fieldErrors?: {
    username?: string
    email?: string
    name?: string
    password?: string
    confirmPassword?: string
  }
  formData?: {
    username: string
    email: string
    name: string
  }
  success?: boolean
  redirectTo?: string
  loginCredentials?: {
    identifier: string
    password: string
  }
  user?: {
    name: string
    username: string
    email: string
  }
}

export interface LoginState {
  errors: string[]
  fieldErrors?: {
    email?: string
    username?: string
    password?: string
  }
  formData?: {
    identifier: string
  }
  success?: boolean
  redirectTo?: string
  credentials?: {
    identifier: string
    password: string
  }
  user?: {
    name: string
    username: string
    email: string
  }
}

export async function loginAction(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const formValues = {
    identifier: formData.get('identifier') as string,
    password: formData.get('password') as string,
  }

  try {
    // Determine if identifier is email or username
    const isEmail = formValues.identifier.includes('@')
    const loginRequest = {
      [isEmail ? 'email' : 'username']: formValues.identifier,
      password: formValues.password,
    }

    const response = await authService.login(loginRequest as LoginRequest)

    // Return success with credentials to trigger NextAuth signIn in the component
    return {
      errors: [],
      success: true,
      credentials: formValues,
      user: {
        name: response.data.user.name,
        username: response.data.user.username,
        email: response.data.user.email,
      },
      redirectTo: '/'
    }
  } catch (error: unknown) {
    console.error('Login error:', error)
    
    // Handle API error responses
    let errorMessage = 'Login failed'
    let fieldErrors: { [key: string]: string } = {}
    
    // Check if it's an ApiClientError
    if (error instanceof ApiClientError) {
      // Handle session expired message during login - it should be treated as login failure
      if (error.message === "Your session has expired. Please login again.") {
        errorMessage = "Invalid email/username or password"
      } else {
        errorMessage = error.message
      }
      
      // Check for validation errors in the error response
      if (error.validationErrors && error.validationErrors.length > 0) {
        // Convert validation errors array to fieldErrors object
        error.validationErrors.forEach((validationError) => {
          fieldErrors[validationError.field] = validationError.message
        })
      }
      
      // Also check if fieldErrors are in the response data
      if (error.response?.data?.data?.fieldErrors) {
        const responseData = error.response.data.data.fieldErrors
        if (responseData && typeof responseData === 'object') {
          fieldErrors = { ...fieldErrors, ...responseData }
        }
      }
      
      console.error('API Error Code:', error.code)
      console.error('API Error Details:', error.details)
      console.error('Field Errors:', fieldErrors)
    } else if (typeof error === 'object' && error !== null && 'response' in error) {
      // Handle axios error response structure
      const axiosError = error as { response: { data: any } }
      const errorData = axiosError.response.data
      
      if (errorData.error?.validationErrors) {
        // Convert validation errors array to fieldErrors object
        errorData.error.validationErrors.forEach((validationError: any) => {
          fieldErrors[validationError.field] = validationError.message
        })
      }
      
      if (errorData.data?.fieldErrors) {
        fieldErrors = { ...fieldErrors, ...errorData.data.fieldErrors }
      }
      
      if (errorData.error?.message) {
        errorMessage = errorData.error.message
      }
    } else if (error instanceof Error) {
      // Handle session expired message during login - it should be treated as login failure
      if (error.message === "Your session has expired. Please login again.") {
        errorMessage = "Invalid email/username or password"
      } else {
        errorMessage = error.message
      }
    }
    
    return {
      errors: Object.keys(fieldErrors).length > 0 ? [] : [errorMessage],
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      formData: {
        identifier: formValues.identifier,
      }
    }
  }
}

export async function registerAction(prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const formValues = {
    username: formData.get('username') as string,
    email: formData.get('email') as string,
    name: formData.get('name') as string,
    password: formData.get('password') as string,
    passwordConfirm: formData.get('confirmPassword') as string, // Note: backend expects passwordConfirm
  }

  try {
    const response = await authService.register(formValues as RegisterRequest)

    // Return success without login credentials (no auto-login)
    return {
      errors: [],
      success: true,
      user: {
        name: response.data.user.name,
        username: response.data.user.username,
        email: response.data.user.email,
      },
      redirectTo: '/auth/login'
    }
  } catch (error: unknown) {
    console.error('Registration error:', error)
    
    // Handle API error responses
    let errorMessage = 'Registration failed'
    let fieldErrors: { [key: string]: string } = {}
    
    // Check if it's an ApiClientError
    if (error instanceof ApiClientError) {
      errorMessage = error.message
      
      // Check for validation errors in the error response
      if (error.validationErrors && error.validationErrors.length > 0) {
        // Convert validation errors array to fieldErrors object
        error.validationErrors.forEach((validationError) => {
          fieldErrors[validationError.field] = validationError.message
        })
      }
      
      // Also check if fieldErrors are in the response data
      if (error.response?.data?.data?.fieldErrors) {
        const responseData = error.response.data.data.fieldErrors
        if (responseData && typeof responseData === 'object') {
          fieldErrors = { ...fieldErrors, ...responseData }
        }
      }
      
      console.error('API Error Code:', error.code)
      console.error('API Error Details:', error.details)
      console.error('Field Errors:', fieldErrors)
    } else if (typeof error === 'object' && error !== null && 'response' in error) {
      // Handle axios error response structure
      const axiosError = error as { response: { data: any } }
      const errorData = axiosError.response.data
      
      if (errorData.error?.validationErrors) {
        // Convert validation errors array to fieldErrors object
        errorData.error.validationErrors.forEach((validationError: any) => {
          fieldErrors[validationError.field] = validationError.message
        })
      }
      
      if (errorData.data?.fieldErrors) {
        fieldErrors = { ...fieldErrors, ...errorData.data.fieldErrors }
      }
      
      if (errorData.error?.message) {
        errorMessage = errorData.error.message
      }
    } else if (error instanceof Error) {
      errorMessage = error.message
    }
    
    return {
      errors: Object.keys(fieldErrors).length > 0 ? [] : [errorMessage],
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      formData: {
        username: formValues.username,
        email: formValues.email,
        name: formValues.name,
      }
    }
  }
}