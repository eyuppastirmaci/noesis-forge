'use server'

import { z } from 'zod'
import { authService } from '@/services/auth.service'
import { RegisterRequest } from '@/types'

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
    
    Object.entries(errors).forEach(([field, messages]) => {
      if (messages && Array.isArray(messages) && messages.length > 0) {
        errorMessages.push(`${field}: ${messages[0]}`)
      }
    })
    
    return {
      errors: errorMessages,
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

    if (response.success) {
      // Registration successful, redirect to success page without exposing password
      return {
        errors: [],
        success: true,
        redirectTo: `/auth/register-success?email=${encodeURIComponent(email)}`
      }
    } else {
      const errorMessage = response.message || 'Registration failed'
      return {
        errors: [errorMessage],
        formData: {
          username,
          email,
          name,
        }
      }
    }
  } catch (error: any) {
    console.error('Registration error:', error)
    
    // Handle API error responses
    if (error?.response?.data) {
      const errorData = error.response.data
      const errorMessage = errorData?.error?.message || errorData?.message || 'Registration failed'
      return {
        errors: [errorMessage],
        formData: {
          username,
          email,
          name,
        }
      }
    }
    
    return {
      errors: ['Network error occurred'],
      formData: {
        username,
        email,
        name,
      }
    }
  }
} 