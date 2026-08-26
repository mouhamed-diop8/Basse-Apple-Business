import {
  OrderStatus,
  PaymentMethod,
  PaymentMethodId,
  ShippingMethod,
  ShippingMethodId,
} from './types';

/** Franc CFA (XOF). Taux BCEAO fixe : 1 € = 655,957 F CFA. */
export const CURRENCY = 'F CFA';

export const EUR_TO_XOF = 655.957;

/** Convertit un montant euro vers le franc CFA, arrondi à la centaine. */
export const cfa = (euros: number): number => Math.round((euros * EUR_TO_XOF) / 100) * 100;

export const FREE_SHIPPING_THRESHOLD = 200_000;

export const RETURN_DAYS = 14;

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: 'standard',
    label: 'Livraison Dakar',
    description: 'Livraison à domicile dans Dakar et Banlieue proche',
    price: 2_500,
    eta: '24 à 48 heures',
    icon: 'cube-outline',
  },
  {
    id: 'express',
    label: 'Livraison express',
    description: 'Prioritaire, suivi WhatsApp en temps réel',
    price: 5_000,
    eta: 'Aujourd’hui ou sous 24 h',
    icon: 'flash-outline',
  },
  {
    id: 'pickup',
    label: 'Retrait en boutique',
    description: 'Centre commercial Keur Massar, disponible sous 2 h',
    price: 0,
    eta: 'Aujourd’hui à partir de 2 h',
    icon: 'storefront-outline',
  },
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'card',
    label: 'Carte bancaire',
    description: 'Visa, Mastercard — paiement sécurisé',
    icon: 'card-outline',
    available: true,
  },
  {
    id: 'mobile_money',
    label: 'Paiement mobile',
    description: 'Orange Money, Wave, Free Money',
    icon: 'phone-portrait-outline',
    available: true,
  },
  {
    id: 'cash_on_delivery',
    label: 'Paiement à la livraison',
    description: 'Réglez en espèces à la réception',
    icon: 'cash-outline',
    available: true,
  },
  {
    id: 'paypal',
    label: 'PayPal',
    description: 'Bientôt disponible',
    icon: 'logo-paypal',
    available: false,
  },
];

export const getShippingMethod = (id: ShippingMethodId): ShippingMethod =>
  SHIPPING_METHODS.find((m) => m.id === id) ?? SHIPPING_METHODS[0];

export const getPaymentMethod = (id: PaymentMethodId): PaymentMethod =>
  PAYMENT_METHODS.find((m) => m.id === id) ?? PAYMENT_METHODS[0];

/** Ordre de progression de la timeline. `cancelled` est hors parcours. */
export const ORDER_FLOW: OrderStatus[] = [
  'received',
  'payment_confirmed',
  'preparing',
  'shipped',
  'delivering',
  'delivered',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Commande reçue',
  payment_confirmed: 'Paiement confirmé',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivering: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const ORDER_STATUS_ICONS: Record<OrderStatus, string> = {
  received: 'receipt-outline',
  payment_confirmed: 'card-outline',
  preparing: 'construct-outline',
  shipped: 'cube-outline',
  delivering: 'bicycle-outline',
  delivered: 'checkmark-done-outline',
  cancelled: 'close-circle-outline',
};

export const PAGE_SIZE = 12;

export const STORE = {
  name: 'Basse Apple Business',
  tagline: 'Revendeur Apple à Dakar — Centre commercial Keur Massar',
  phone: process.env.EXPO_PUBLIC_STORE_PHONE ?? '+221 77 349 18 87',
  /** Numéro WhatsApp sans « + », pour wa.me */
  whatsapp: process.env.EXPO_PUBLIC_STORE_WHATSAPP ?? '221773491887',
  email: process.env.EXPO_PUBLIC_STORE_EMAIL ?? 'contact@basseapplebusiness.com',
  address: 'Centre commercial Keur Massar, Dakar, Sénégal',
  city: 'Dakar',
  country: 'Sénégal',
  hours: 'Lun – Sam : 10 h – 20 h · Dim : 10 h – 14 h',
  disclaimer: 'Revendeur indépendant, non affilié à Apple Inc.',
};

export const whatsappUrl = (message?: string): string => {
  const base = `https://wa.me/${STORE.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};
