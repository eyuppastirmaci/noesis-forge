"use client";

import { Provider } from 'react-redux'
import { store } from '@/store'
import ToastNotification from '@/components/ToastNotification'

interface ToastProviderProps {
  children: React.ReactNode
}

export default function ToastProvider({ children }: ToastProviderProps) {
  return (
    <Provider store={store}>
      {children}
      <ToastNotification />
    </Provider>
  )
} 