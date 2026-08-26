import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { db } from '@/data';

interface FavoritesState {
  /** Identifiants de produits favoris de l'utilisateur courant. */
  ids: string[];
  userId: string | null;

  /** Charge les favoris du serveur, ou vide la liste à la déconnexion. */
  syncWithUser(userId: string | null): Promise<void>;
  toggle(productId: string): Promise<boolean>;
  isFavorite(productId: string): boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      userId: null,

      syncWithUser: async (userId) => {
        if (!userId) {
          set({ ids: [], userId: null });
          return;
        }

        set({ userId });

        try {
          const remote = await db.getFavorites(userId);
          // Les favoris ajoutés hors connexion sont conservés et fusionnés.
          const merged = Array.from(new Set([...remote, ...get().ids]));

          await Promise.all(
            merged
              .filter((id) => !remote.includes(id))
              .map((id) => db.setFavorite(userId, id, true)),
          );

          set({ ids: merged });
        } catch {
          // Hors ligne : on garde la liste locale.
        }
      },

      toggle: async (productId) => {
        const { ids, userId } = get();
        const next = ids.includes(productId);

        set({ ids: next ? ids.filter((id) => id !== productId) : [...ids, productId] });

        if (userId) {
          try {
            await db.setFavorite(userId, productId, !next);
          } catch {
            // La liste locale reste la source d'affichage en cas d'échec réseau.
          }
        }

        return !next;
      },

      isFavorite: (productId) => get().ids.includes(productId),
    }),
    {
      name: 'techstore.favorites.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const useIsFavorite = (productId: string): boolean =>
  useFavoritesStore((state) => state.ids.includes(productId));
