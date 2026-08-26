import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const MAX_HISTORY = 8;

interface SearchState {
  history: string[];
  remember(term: string): void;
  forget(term: string): void;
  clear(): void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      history: [],

      remember: (term) => {
        const value = term.trim();
        if (value.length < 2) return;

        set({
          history: [value, ...get().history.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(
            0,
            MAX_HISTORY,
          ),
        });
      },

      forget: (term) => set({ history: get().history.filter((item) => item !== term) }),

      clear: () => set({ history: [] }),
    }),
    {
      name: 'techstore.search.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
