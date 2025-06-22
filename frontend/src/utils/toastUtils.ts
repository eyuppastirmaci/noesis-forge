import { store } from '@/store'
import { addToast } from '@/store/slices/toastSlice'

/**
 * Toast notification methods
 * Provides methods to display different types of toast notifications
 */
export const toast = {
  /**
   * Display a success toast notification
   * @param message - Success message to display
   * @example
   * toast.success('Document uploaded successfully!');
   */
  success: (message: string) => {
    store.dispatch(addToast({ type: 'success', message }))
  },
  
  /**
   * Display an error toast notification
   * @param message - Error message to display
   * @example
   * toast.error('Failed to upload document');
   */
  error: (message: string) => {
    store.dispatch(addToast({ type: 'error', message }))
  },
  
  /**
   * Display an info toast notification
   * @param message - Info message to display
   * @example
   * toast.info('Processing your request...');
   */
  info: (message: string) => {
    store.dispatch(addToast({ type: 'info', message }))
  }
} 