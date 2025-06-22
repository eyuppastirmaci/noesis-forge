import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface SidebarState {
  isOpen: boolean
}

const initialState: SidebarState = {
  isOpen: false,
}

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    openSidebar: (state) => {
      state.isOpen = true
    },
    closeSidebar: (state) => {
      state.isOpen = false
    },
    toggleSidebar: (state) => {
      state.isOpen = !state.isOpen
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload
    },
  },
})

export const { openSidebar, closeSidebar, toggleSidebar, setSidebarOpen } = sidebarSlice.actions
export default sidebarSlice.reducer 