import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  /** Libellé optionnel d'action, ex. « Voir le panier ». */
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  toasts: Toast[];
  show(toast: Omit<Toast, 'id'>, durationMs?: number): void;
  dismiss(id: string): void;
}

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  show: (toast, durationMs = 3200) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Un seul toast à la fois : le nouveau remplace le précédent.
    set({ toasts: [{ ...toast, id }] });

    setTimeout(() => get().dismiss(id), durationMs);
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));

export const toast = {
  success: (message: string, action?: Pick<Toast, 'actionLabel' | 'onAction'>) =>
    useToastStore.getState().show({ variant: 'success', message, ...action }),
  error: (message: string) => useToastStore.getState().show({ variant: 'error', message }, 4200),
  info: (message: string, action?: Pick<Toast, 'actionLabel' | 'onAction'>) =>
    useToastStore.getState().show({ variant: 'info', message, ...action }),
};
