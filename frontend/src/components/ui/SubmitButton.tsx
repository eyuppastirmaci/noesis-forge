'use client'

import { useFormStatus } from 'react-dom'
import Button from './Button'

interface SubmitButtonProps {
  children: React.ReactNode
  loadingText?: string
  variant?: "primary" | "secondary" | "outline" | "ghost" | "error"
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
  disabled?: boolean
  className?: string
}

export default function SubmitButton({
  children,
  loadingText = "Loading...",
  variant = "primary",
  size = "lg",
  fullWidth = false,
  disabled = false,
  className = "",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      loading={pending}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
      {...props}
    >
      {pending ? loadingText : children}
    </Button>
  )
} 