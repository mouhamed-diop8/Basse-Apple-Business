import { cfa, FREE_SHIPPING_THRESHOLD, getShippingMethod, ORDER_FLOW, ORDER_STATUS_LABELS } from '../constants';
import {
  Order,
  OrderEvent,
  OrderItem,
  OrderStatus,
  PaymentMethodId,
  PaymentStatus,
  ShippingMethodId,
} from '../types';
import { demoProducts } from './products';
import { demoAddresses, demoUsers } from './users';

const REFERENCE = new Date('2026-08-20T10:00:00.000Z').getTime();
const at = (daysAgo: number, hour = 11) =>
  new Date(REFERENCE - daysAgo * 86_400_000 + hour * 3_600_000).toISOString();

const effective = (productId: string) => {
  const product = demoProducts.find((p) => p.id === productId)!;
  return product.sale_price && product.sale_price < product.price ? product.sale_price : product.price;
};

const productName = (productId: string) =>
  demoProducts.find((p) => p.id === productId)?.name ?? 'Produit';

const productBrand = (productId: string) =>
  demoProducts.find((p) => p.id === productId)?.brand ?? '';

interface OrderDraft {
  ref: string;
  user_id: string;
  daysAgo: number;
  status: OrderStatus;
  shipping: ShippingMethodId;
  payment: PaymentMethodId;
  lines: [productId: string, quantity: number, variant: string | null][];
  promo?: [code: string, amount: number];
  tracking?: string;
}

const drafts: OrderDraft[] = [
  {
    ref: 'TS-24081',
    user_id: 'user-demo',
    daysAgo: 1,
    status: 'preparing',
    shipping: 'express',
    payment: 'card',
    lines: [
      ['iphone-17-pro', 1, 'Titane naturel · 256 Go'],
      ['chargeur-anker-65w', 1, 'Blanc'],
    ],
    promo: ['TECH50', cfa(50)],
  },
  {
    ref: 'TS-24072',
    user_id: 'user-demo',
    daysAgo: 6,
    status: 'delivering',
    shipping: 'standard',
    payment: 'mobile_money',
    lines: [['airpods-pro-2', 1, 'Blanc']],
    tracking: 'TSX9834712SN',
  },
  {
    ref: 'TS-24055',
    user_id: 'user-demo',
    daysAgo: 21,
    status: 'delivered',
    shipping: 'standard',
    payment: 'card',
    lines: [
      ['logitech-mx-master-3s', 1, 'Graphite'],
      ['logitech-mx-keys-s', 1, 'Graphite'],
      ['tapis-souris-xl', 1, 'Noir'],
    ],
    promo: ['ACCESSOIRES20', cfa(42.74)],
    tracking: 'TSX7712004SN',
  },
  {
    ref: 'TS-24012',
    user_id: 'user-demo',
    daysAgo: 74,
    status: 'delivered',
    shipping: 'pickup',
    payment: 'cash_on_delivery',
    lines: [['macbook-air-13-m2', 1, 'Minuit · 256 Go']],
    tracking: null as unknown as string,
  },
  {
    ref: 'TS-23994',
    user_id: 'user-demo',
    daysAgo: 96,
    status: 'cancelled',
    shipping: 'standard',
    payment: 'card',
    lines: [['ipad-10', 1, 'Argent · 64 Go']],
  },
  {
    ref: 'TS-24086',
    user_id: 'demo-user-11',
    daysAgo: 0,
    status: 'received',
    shipping: 'standard',
    payment: 'cash_on_delivery',
    lines: [
      ['iphone-16', 1, 'Noir · 128 Go'],
      ['chargeur-magsafe', 1, 'Blanc'],
    ],
  },
  {
    ref: 'TS-24085',
    user_id: 'demo-user-10',
    daysAgo: 0,
    status: 'payment_confirmed',
    shipping: 'express',
    payment: 'card',
    lines: [['macbook-pro-14-m4', 1, 'Noir sidéral · 512 Go · 16 Go']],
    promo: ['BIENVENUE10', cfa(189.9)],
  },
  {
    ref: 'TS-24084',
    user_id: 'demo-user-9',
    daysAgo: 1,
    status: 'preparing',
    shipping: 'standard',
    payment: 'mobile_money',
    lines: [
      ['dell-u2723qe', 2, 'Gris platine'],
      ['dock-thunderbolt-4', 1, 'Argent'],
    ],
  },
  {
    ref: 'TS-24080',
    user_id: 'demo-user-8',
    daysAgo: 2,
    status: 'shipped',
    shipping: 'standard',
    payment: 'card',
    lines: [['galaxy-s25-ultra', 1, 'Noir · 256 Go']],
    tracking: 'TSX9911223SN',
  },
  {
    ref: 'TS-24078',
    user_id: 'demo-user-7',
    daysAgo: 3,
    status: 'delivering',
    shipping: 'express',
    payment: 'card',
    lines: [
      ['samsung-t7-1to', 3, 'Noir · 1 To'],
      ['cle-usb-sandisk-128', 2, 'Noir · 128 Go'],
    ],
    tracking: 'TSX9905517SN',
  },
  {
    ref: 'TS-24070',
    user_id: 'demo-user-6',
    daysAgo: 7,
    status: 'delivered',
    shipping: 'standard',
    payment: 'mobile_money',
    lines: [['brother-dcp-l2530dw', 1, 'Noir'], ['onduleur-apc-650', 1, 'Noir']],
    tracking: 'TSX9877431SN',
  },
  {
    ref: 'TS-24066',
    user_id: 'demo-user-5',
    daysAgo: 9,
    status: 'delivered',
    shipping: 'standard',
    payment: 'card',
    lines: [['lenovo-thinkpad-x1-carbon', 1, 'Noir carbone · 1 To']],
    promo: ['TECH50', cfa(50)],
    tracking: 'TSX9866120SN',
  },
  {
    ref: 'TS-24060',
    user_id: 'demo-user-4',
    daysAgo: 13,
    status: 'delivered',
    shipping: 'pickup',
    payment: 'cash_on_delivery',
    lines: [
      ['logitech-brio-500', 1, 'Graphite'],
      ['casque-logitech-h390', 2, 'Noir'],
    ],
  },
  {
    ref: 'TS-24051',
    user_id: 'demo-user-3',
    daysAgo: 18,
    status: 'delivered',
    shipping: 'standard',
    payment: 'card',
    lines: [['iphone-15', 1, 'Noir · 128 Go'], ['chargeur-apple-30w', 1, 'Blanc']],
    tracking: 'TSX9812744SN',
  },
  {
    ref: 'TS-24044',
    user_id: 'demo-user-2',
    daysAgo: 24,
    status: 'delivered',
    shipping: 'express',
    payment: 'mobile_money',
    lines: [['ipad-pro-11-m4', 1, 'Noir sidéral · 256 Go']],
    tracking: 'TSX9798033SN',
  },
  {
    ref: 'TS-24038',
    user_id: 'demo-user-1',
    daysAgo: 29,
    status: 'delivered',
    shipping: 'standard',
    payment: 'card',
    lines: [
      ['hp-e24-g5', 4, 'Noir'],
      ['logitech-m185', 4, 'Noir'],
      ['logitech-k380', 4, 'Graphite'],
    ],
    promo: ['ACCESSOIRES20', cfa(217.28)],
    tracking: 'TSX9781200SN',
  },
  {
    ref: 'TS-24030',
    user_id: 'demo-user-0',
    daysAgo: 36,
    status: 'delivered',
    shipping: 'standard',
    payment: 'card',
    lines: [['sony-wh1000xm5', 1, 'Noir']],
    tracking: 'TSX9760118SN',
  },
  {
    ref: 'TS-24024',
    user_id: 'demo-user-4',
    daysAgo: 44,
    status: 'delivered',
    shipping: 'standard',
    payment: 'mobile_money',
    lines: [['dell-latitude-5450', 2, 'Gris · 512 Go · 16 Go']],
    tracking: 'TSX9744509SN',
  },
  {
    ref: 'TS-24018',
    user_id: 'demo-user-6',
    daysAgo: 52,
    status: 'cancelled',
    shipping: 'express',
    payment: 'card',
    lines: [['macbook-pro-16-m4-max', 1, 'Noir sidéral · 1 To · 36 Go']],
  },
  {
    ref: 'TS-24009',
    user_id: 'demo-user-8',
    daysAgo: 63,
    status: 'delivered',
    shipping: 'standard',
    payment: 'card',
    lines: [['epson-ecotank-2850', 1, 'Blanc'], ['support-ordinateur-alu', 2, 'Argent']],
    tracking: 'TSX9700882SN',
  },
  {
    ref: 'TS-23998',
    user_id: 'demo-user-9',
    daysAgo: 81,
    status: 'delivered',
    shipping: 'standard',
    payment: 'cash_on_delivery',
    lines: [['galaxy-a55', 2, 'Noir · 128 Go'], ['cable-usbc-2m', 3, 'Noir · 2 m']],
    tracking: 'TSX9688431SN',
  },
  {
    ref: 'TS-23987',
    user_id: 'demo-user-2',
    daysAgo: 104,
    status: 'delivered',
    shipping: 'standard',
    payment: 'card',
    lines: [['macbook-air-15-m3', 1, 'Argent · 256 Go · 8 Go']],
    promo: ['BIENVENUE10', cfa(129.9)],
    tracking: 'TSX9611203SN',
  },
  {
    ref: 'TS-23970',
    user_id: 'demo-user-5',
    daysAgo: 128,
    status: 'delivered',
    shipping: 'standard',
    payment: 'card',
    lines: [['dell-xps-13', 1, 'Graphite · 512 Go · 16 Go'], ['hub-usbc-7en1', 1, 'Gris sidéral']],
    tracking: 'TSX9540117SN',
  },
  {
    ref: 'TS-23955',
    user_id: 'demo-user-7',
    daysAgo: 152,
    status: 'delivered',
    shipping: 'standard',
    payment: 'mobile_money',
    lines: [['airpods-max', 1, 'Noir'], ['apple-magic-keyboard', 1, 'Blanc']],
    tracking: 'TSX9488220SN',
  },
];

/** Construit l'historique d'une commande jusqu'à son statut courant. */
const buildHistory = (status: OrderStatus, createdDaysAgo: number): OrderEvent[] => {
  if (status === 'cancelled') {
    return [
      { status: 'received', date: at(createdDaysAgo), note: 'Commande enregistrée' },
      {
        status: 'cancelled',
        date: at(Math.max(0, createdDaysAgo - 1)),
        note: 'Annulée à la demande du client',
      },
    ];
  }

  const upTo = ORDER_FLOW.indexOf(status);
  const span = Math.max(1, Math.min(createdDaysAgo, 5));

  return ORDER_FLOW.slice(0, upTo + 1).map((step, index) => ({
    status: step,
    date: at(Math.max(0, createdDaysAgo - Math.round((index * span) / Math.max(1, upTo)))),
    note: ORDER_STATUS_LABELS[step],
  }));
};

const paymentStatusFor = (
  status: OrderStatus,
  payment: PaymentMethodId,
): PaymentStatus => {
  if (status === 'cancelled') return 'refunded';
  if (payment === 'cash_on_delivery') return status === 'delivered' ? 'paid' : 'pending';
  return status === 'received' ? 'pending' : 'paid';
};

const build = (draft: OrderDraft): Order => {
  const user = demoUsers.find((u) => u.id === draft.user_id)!;

  const items: OrderItem[] = draft.lines.map(([productId, quantity, variant], index) => ({
    id: `${draft.ref}-item-${index}`,
    order_id: draft.ref,
    product_id: productId,
    name: productName(productId),
    image: demoProducts.find((p) => p.id === productId)?.images[0] ?? '',
    variant_label: variant,
    quantity,
    unit_price: effective(productId),
  }));

  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const method = getShippingMethod(draft.shipping);
  const shipping_cost = subtotal >= FREE_SHIPPING_THRESHOLD && draft.shipping === 'standard' ? 0 : method.price;
  const discount = draft.promo?.[1] ?? 0;

  return {
    id: draft.ref,
    reference: draft.ref,
    user_id: draft.user_id,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    shipping_cost,
    discount: Math.round(discount * 100) / 100,
    total: Math.round((subtotal + shipping_cost - discount) * 100) / 100,
    status: draft.status,
    payment_status: paymentStatusFor(draft.status, draft.payment),
    payment_method: draft.payment,
    shipping_method: draft.shipping,
    shipping_address: {
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      email: user.email,
      address:
        draft.user_id === 'user-demo'
          ? demoAddresses[0].address
          : `Cité ${draft.ref.slice(-2)}, villa ${12 + draft.ref.length}`,
      city: 'Dakar',
      district: draft.user_id === 'user-demo' ? 'Keur Massar' : 'Pikine',
      country: 'Sénégal',
      instructions: '',
    },
    promo_code: draft.promo?.[0] ?? null,
    tracking_number: draft.tracking ?? null,
    eta: method.eta,
    customer_name: `${user.first_name} ${user.last_name}`,
    customer_phone: user.phone,
    customer_email: user.email,
    history: buildHistory(draft.status, draft.daysAgo),
    created_at: at(draft.daysAgo),
  };
};

export const demoOrders: Order[] = drafts.map(build);

/** Marques présentes dans les commandes, utile aux statistiques de démonstration. */
export const demoOrderBrands = Array.from(
  new Set(demoOrders.flatMap((o) => o.items.map((i) => productBrand(i.product_id)))),
);
