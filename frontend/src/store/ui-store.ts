'use client';

import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  isSearchOpen: boolean;

  toggleSidebar: () => void;
  closeSidebar: () => void;
  toggleSearch: () => void;
  closeSearch: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  isSearchOpen: false,

  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSearch: () => set((s) => ({ isSearchOpen: !s.isSearchOpen })),
  closeSearch: () => set({ isSearchOpen: false }),
}));
