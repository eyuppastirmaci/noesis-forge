'use server'

import { z } from 'zod'
import { authService } from '@/services/auth.service'
import { RegisterRequest } from '@/types'
import { ApiClientError } from '@/types/api'

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password is required'),
}).refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

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
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const validatedFields = registerSchema.safeParse(formValues)

  if (!validatedFields.success) {
    const errors = validatedFields.error.flatten().fieldErrors
    const errorMessages: string[] = []
    const fieldErrors: { [key: string]: string } = {}
    
    Object.entries(errors).forEach(([field, messages]) => {
      if (messages && Array.isArray(messages) && messages.length > 0) {
        fieldErrors[field] = messages[0]
        errorMessages.push(`${field}: ${messages[0]}`)
      }
    })
    
    return {
      errors: errorMessages,
      fieldErrors,
      formData: {
        username: formValues.username,
        email: formValues.email,
        name: formValues.name,
      }
    }
  }

  const { username, email, name, password } = validatedFields.data

  try {
    const registerData: RegisterRequest = {
      username,
      email,
      name,
      password,
      passwordConfirm: password,
    }

    const response = await authService.register(registerData)

    // If we reach here, registration was successful
    return {
      errors: [],
      success: true,
      redirectTo: `/auth/register-success?email=${encodeURIComponent(email)}`
    }
  } catch (error: any) {
    console.error('Registration error:', error)
    
    // Handle API error responses
    let errorMessage = 'Registration failed'
    let fieldErrors: { [key: string]: string } = {}
    
    // Check if it's an ApiClientError
    if (error instanceof ApiClientError) {
      errorMessage = error.message
      
      // Check if it's a field-specific error based on the message
      if (errorMessage.toLowerCase().includes('username already exists')) {
        fieldErrors.username = 'This username is already taken'
      } else if (errorMessage.toLowerCase().includes('email already exists')) {
        fieldErrors.email = 'This email is already registered'
      }
      
      console.error('API Error Code:', error.code)
      console.error('API Error Details:', error.details)
    } else if (error?.message) {
      // Fallback for other error types
      errorMessage = error.message
      
      if (errorMessage.toLowerCase().includes('username already exists')) {
        fieldErrors.username = 'This username is already taken'
      } else if (errorMessage.toLowerCase().includes('email already exists')) {
        fieldErrors.email = 'This email is already registered'
      }
    }
    
    return {
      errors: [errorMessage],
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      formData: {
        username,
        email,
        name,
      }
    }
  }
} 