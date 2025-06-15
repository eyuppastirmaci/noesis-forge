'use server'

import { authService } from '@/services/auth.service'
import { RegisterRequest } from '@/types'
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

    // If we reach here, registration was successful
    return {
      errors: [],
      success: true,
      redirectTo: `/auth/register-success?email=${encodeURIComponent(formValues.email)}`
    }
  } catch (error: any) {
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
      const responseData = (error as any).response?.data?.data?.fieldErrors
      if (responseData && typeof responseData === 'object') {
        fieldErrors = { ...fieldErrors, ...responseData }
      }
      
      console.error('API Error Code:', error.code)
      console.error('API Error Details:', error.details)
      console.error('Field Errors:', fieldErrors)
    } else if (error?.response?.data) {
      // Handle axios error response structure
      const errorData = error.response.data
      
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
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    return {
      errors: Object.keys(fieldErrors).length > 0 ? [] : [errorMessage], // Only show general error if no field errors
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      formData: {
        username: formValues.username,
        email: formValues.email,
        name: formValues.name,
      }
    }
  }
}