import { store } from '@/store'
import { addToast } from '@/store/slices/toastSlice'

export const toast = {
  success: (message: string) => {
    store.dispatch(addToast({ type: 'success', message }))
  },
  error: (message: string) => {
    store.dispatch(addToast({ type: 'error', message }))
  },
  info: (message: string) => {
    store.dispatch(addToast({ type: 'info', message }))
  }
} 