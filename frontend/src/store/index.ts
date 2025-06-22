import { configureStore } from '@reduxjs/toolkit'
import toastReducer from './slices/toastSlice'
import sidebarReducer from './slices/sidebarSlice'

export const store = configureStore({
  reducer: {
    toast: toastReducer,
    sidebar: sidebarReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch 