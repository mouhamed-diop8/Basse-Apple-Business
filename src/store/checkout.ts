import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { STORE } from '@/data/constants';
import { Order, PaymentMethodId, ShippingAddress } from '@/data/types';

export interface CheckoutContact {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
}

export interface CheckoutAddress {
  address: string;
  city: string;
  district: string;
  country: string;
  instructions: string;
}

interface CheckoutState {
  contact: CheckoutContact;
  address: CheckoutAddress;
  paymentMethod: PaymentMethodId;
  /** Champs de carte : jamais persistés ni transmis à la base. */
  card: { number: string; holder: string; expiry: string; cvc: string };
  mobileNumber: string;
  lastOrder: Order | null;

  setContact(patch: Partial<CheckoutContact>): void;
  setAddress(patch: Partial<CheckoutAddress>): void;
  setPaymentMethod(method: PaymentMethodId): void;
  setCard(patch: Partial<CheckoutState['card']>): void;
  setMobileNumber(value: string): void;
  setLastOrder(order: Order | null): void;
  toShippingAddress(): ShippingAddress;
  reset(): void;
}

const emptyContact: CheckoutContact = { first_name: '', last_name: '', phone: '', email: '' };

const emptyAddress: CheckoutAddress = {
  address: '',
  city: STORE.city,
  district: '',
  country: STORE.country,
  instructions: '',
};

const emptyCard = { number: '', holder: '', expiry: '', cvc: '' };

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      contact: emptyContact,
      address: emptyAddress,
      paymentMethod: 'mobile_money',
      card: emptyCard,
      mobileNumber: '',
      lastOrder: null,

      setContact: (patch) => set({ contact: { ...get().contact, ...patch } }),
      setAddress: (patch) => set({ address: { ...get().address, ...patch } }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setCard: (patch) => set({ card: { ...get().card, ...patch } }),
      setMobileNumber: (mobileNumber) => set({ mobileNumber }),
      setLastOrder: (lastOrder) => set({ lastOrder }),

      toShippingAddress: () => ({ ...get().contact, ...get().address }),

      reset: () =>
        set({
          contact: emptyContact,
          address: emptyAddress,
          paymentMethod: 'mobile_money',
          card: emptyCard,
          mobileNumber: '',
        }),
    }),
    {
      name: 'basseapple.checkout.v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        contact: state.contact,
        address: state.address,
        paymentMethod: state.paymentMethod,
        mobileNumber: state.mobileNumber,
      }),
    },
  ),
);
