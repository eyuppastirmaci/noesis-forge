'use server'

import { z } from 'zod'

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
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        email,
        name,
        password,
        passwordConfirm: password,
      }),
    });

    const data = await response.json()

    if (!response.ok) {
      // Handle error response
      const errorMessage = data?.error?.message || data?.message || 'Registration failed'
      return {
        errors: [errorMessage],
        formData: {
          username,
          email,
          name,
        }
      }
    }

    if (data.success) {
      // Registration successful, return success state to redirect on client-side
      return {
        errors: [],
        success: true,
        redirectTo: `/auth/register-success?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
      }
    } else {
      const errorMessage = data?.error?.message || 'Registration failed'
      return {
        errors: [errorMessage],
        formData: {
          username,
          email,
          name,
        }
      }
    }
  } catch (error) {
    console.error('Registration error:', error)
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