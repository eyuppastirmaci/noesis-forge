"use client";

import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@/store'
import { removeToast, Toast } from '@/store/slices/toastSlice'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const ToastItem = ({ toast }: { toast: Toast }) => {
  const dispatch = useDispatch()

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(removeToast(toast.id))
    }, 4000) // 4 seconds

    return () => clearTimeout(timer)
  }, [dispatch, toast.id])

  const handleClose = () => {
    dispatch(removeToast(toast.id))
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red" />
      case 'info':
        return <Info className="w-5 h-5 text-blue" />
      default:
        return null
    }
  }

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
      case 'error':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
      case 'info':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
      default:
        return 'bg-background border-border'
    }
  }

  return (
    <div
      className={`
        flex items-center gap-3 p-4 rounded-lg border shadow-lg min-w-80 max-w-96
        ${getBackgroundColor()}
        animate-in slide-in-from-right-2 fade-in-0 duration-300
      `}
    >
      {getIcon()}
      <p className="flex-1 text-sm font-medium text-foreground">{toast.message}</p>
      <button
        onClick={handleClose}
        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X className="w-4 h-4 text-foreground-secondary" />
      </button>
    </div>
  )
}

export default function ToastNotification() {
  const toasts = useSelector((state: RootState) => state.toast.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
} 