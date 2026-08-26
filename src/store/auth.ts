import { create } from 'zustand';

import { db } from '@/data';
import { RepositoryError, SignUpPayload } from '@/data/repository';
import { User } from '@/data/types';

interface AuthState {
  user: User | null;
  token: string | null;
  /** `true` pendant la restauration de session au démarrage. */
  restoring: boolean;
  busy: boolean;
  error: string | null;
  pendingConfirmation: string | null;

  restore(): Promise<void>;
  signIn(email: string, password: string): Promise<boolean>;
  /** `ok` connecté, `pending` email à confirmer, `error` formulaire à corriger. */
  signUp(payload: SignUpPayload): Promise<'ok' | 'pending' | 'error'>;
  signOut(): Promise<void>;
  updateProfile(patch: Partial<User>): Promise<boolean>;
  clearError(): void;
}

const messageOf = (error: unknown): string =>
  error instanceof RepositoryError
    ? error.message
    : 'Une erreur inattendue est survenue. Réessayez.';

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  restoring: true,
  busy: false,
  error: null,
  pendingConfirmation: null,

  restore: async () => {
    try {
      const session = await db.restoreSession();
      set({ user: session?.user ?? null, token: session?.token ?? null });
    } catch {
      set({ user: null, token: null });
    } finally {
      set({ restoring: false });
    }
  },

  signIn: async (email, password) => {
    set({ busy: true, error: null });
    try {
      const session = await db.signIn(email, password);
      set({ user: session.user, token: session.token, busy: false });
      return true;
    } catch (error) {
      set({ busy: false, error: messageOf(error) });
      return false;
    }
  },

  signUp: async (payload) => {
    set({ busy: true, error: null, pendingConfirmation: null });
    try {
      const session = await db.signUp(payload);
      set({ user: session.user, token: session.token, busy: false });
      return 'ok';
    } catch (error) {
      if (error instanceof RepositoryError && error.code === 'email_confirmation') {
        set({
          busy: false,
          error: null,
          pendingConfirmation: payload.email.trim().toLowerCase(),
        });
        return 'pending';
      }
      set({ busy: false, error: messageOf(error) });
      return 'error';
    }
  },

  signOut: async () => {
    await db.signOut();
    set({ user: null, token: null, error: null });
  },

  updateProfile: async (patch) => {
    const current = get().user;
    if (!current) return false;

    set({ busy: true, error: null });
    try {
      const user = await db.updateProfile(current.id, patch);
      set({ user, busy: false });
      return true;
    } catch (error) {
      set({ busy: false, error: messageOf(error) });
      return false;
    }
  },

  clearError: () => set({ error: null, pendingConfirmation: null }),
}));

export const useIsAdmin = (): boolean => useAuthStore((state) => state.user?.role === 'admin');
export const useCurrentUser = (): User | null => useAuthStore((state) => state.user);
