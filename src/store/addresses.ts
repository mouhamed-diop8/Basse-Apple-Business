import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { demoAddresses } from '@/data/demo/users';
import { SavedAddress } from '@/data/types';

interface AddressesState {
  items: SavedAddress[];
  save(address: Omit<SavedAddress, 'id'> & { id?: string }): SavedAddress;
  remove(id: string): void;
  setDefault(id: string): void;
  getDefault(): SavedAddress | null;
}

export const useAddressesStore = create<AddressesState>()(
  persist(
    (set, get) => ({
      items: demoAddresses,

      save: (address) => {
        const id = address.id ?? `address-${Date.now()}`;
        const isFirst = get().items.length === 0;
        const saved: SavedAddress = { ...address, id, is_default: address.is_default || isFirst };

        const items = address.id
          ? get().items.map((item) => (item.id === id ? saved : item))
          : [...get().items, saved];

        set({
          items: saved.is_default
            ? items.map((item) => ({ ...item, is_default: item.id === id }))
            : items,
        });

        return saved;
      },

      remove: (id) => {
        const items = get().items.filter((item) => item.id !== id);

        // Il doit toujours rester une adresse par défaut si la liste n'est pas vide.
        if (items.length && !items.some((item) => item.is_default)) {
          items[0] = { ...items[0], is_default: true };
        }

        set({ items });
      },

      setDefault: (id) =>
        set({ items: get().items.map((item) => ({ ...item, is_default: item.id === id })) }),

      getDefault: () => get().items.find((item) => item.is_default) ?? get().items[0] ?? null,
    }),
    {
      name: 'techstore.addresses.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
