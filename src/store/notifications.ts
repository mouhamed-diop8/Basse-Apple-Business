import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { cfa, ORDER_STATUS_LABELS } from '@/data/constants';
import { AppNotification, NotificationKind, Order, OrderStatus } from '@/data/types';
import { formatPrice } from '@/utils/format';

interface NotificationsState {
  items: AppNotification[];
  enabled: Record<NotificationKind, boolean>;

  push(input: {
    kind: NotificationKind;
    title: string;
    body: string;
    target?: string;
  }): void;
  notifyOrderCreated(order: Order): void;
  notifyStatusChange(order: Order, status: OrderStatus): void;
  markAllRead(): void;
  markRead(id: string): void;
  remove(id: string): void;
  clear(): void;
  setEnabled(kind: NotificationKind, value: boolean): void;
}

const seedNotifications = (): AppNotification[] => {
  const now = Date.now();

  return [
    {
      id: 'seed-promo',
      kind: 'promotion',
      title: '-20 % sur les accessoires',
      body: 'Profitez du code ACCESSOIRES20 sur les claviers, souris et hubs jusqu’à dimanche.',
      read: false,
      created_at: new Date(now - 3 * 3_600_000).toISOString(),
      target: '/catalogue?categorie=accessories&promo=1',
    },
    {
      id: 'seed-new',
      kind: 'new_product',
      title: 'Les iPhone 17 sont arrivés',
      body: 'iPhone 17, 17 Pro et 17 Pro Max sont disponibles en stock, livrés en 24 h.',
      read: false,
      created_at: new Date(now - 26 * 3_600_000).toISOString(),
      target: '/catalogue?categorie=iphone',
    },
    {
      id: 'seed-price',
      kind: 'price_drop',
      title: 'Baisse de prix sur un favori',
      body: `Le MacBook Pro 14" M4 est passé de ${formatPrice(cfa(2099))} à ${formatPrice(cfa(1899))}.`,
      read: true,
      created_at: new Date(now - 3 * 86_400_000).toISOString(),
      target: '/produit/macbook-pro-14-m4',
    },
  ];
};

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: seedNotifications(),
      enabled: {
        order_confirmed: true,
        status_change: true,
        delivery: true,
        promotion: true,
        new_product: true,
        price_drop: true,
      },

      push: ({ kind, title, body, target }) => {
        if (!get().enabled[kind]) return;

        set({
          items: [
            {
              id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              kind,
              title,
              body,
              read: false,
              created_at: new Date().toISOString(),
              target,
            },
            ...get().items,
          ].slice(0, 60),
        });
      },

      notifyOrderCreated: (order) =>
        get().push({
          kind: 'order_confirmed',
          title: `Commande ${order.reference} confirmée`,
          body: `Votre commande de ${formatPrice(order.total)} est enregistrée. Livraison estimée : ${order.eta}.`,
          target: `/commandes/${order.reference}`,
        }),

      notifyStatusChange: (order, status) =>
        get().push({
          kind: status === 'delivered' || status === 'delivering' ? 'delivery' : 'status_change',
          title: `Commande ${order.reference} — ${ORDER_STATUS_LABELS[status]}`,
          body:
            status === 'delivered'
              ? 'Votre colis a été livré. Merci pour votre confiance !'
              : `Le statut de votre commande est passé à « ${ORDER_STATUS_LABELS[status]} ».`,
          target: `/commandes/${order.reference}`,
        }),

      markAllRead: () => set({ items: get().items.map((item) => ({ ...item, read: true })) }),

      markRead: (id) =>
        set({
          items: get().items.map((item) => (item.id === id ? { ...item, read: true } : item)),
        }),

      remove: (id) => set({ items: get().items.filter((item) => item.id !== id) }),

      clear: () => set({ items: [] }),

      setEnabled: (kind, value) => set({ enabled: { ...get().enabled, [kind]: value } }),
    }),
    {
      name: 'techstore.notifications.v2',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const useUnreadCount = (): number =>
  useNotificationsStore((state) => state.items.filter((item) => !item.read).length);
