import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  add: (type: ToastType, message: string) => void;
  remove: (id: string) => void;
}

const DISMISS_MS = 5000;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  add: (type, message) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, DISMISS_MS);
  },

  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().add('success', message),
  error: (message: string) => useToastStore.getState().add('error', message),
  info: (message: string) => useToastStore.getState().add('info', message),
  warning: (message: string) => useToastStore.getState().add('warning', message),
};
