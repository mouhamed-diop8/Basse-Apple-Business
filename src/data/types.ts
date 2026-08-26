/**
 * Modèle de domaine. Les noms de champs suivent le schéma SQL de la section 22
 * du cahier des charges (snake_case) pour éviter toute couche de traduction
 * entre la base et l'application.
 */

export type UserRole = 'customer' | 'admin';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar_url?: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  icon: string;
  position: number;
}

export type ProductCondition = 'new' | 'refurbished';

export type ProductBadge = 'new' | 'promo' | 'bestseller';

/** Caractéristique technique affichée dans le tableau de la fiche produit. */
export interface SpecEntry {
  label: string;
  value: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  position: number;
}

export type VariantKind = 'color' | 'storage' | 'ram' | 'size' | 'config';

/**
 * Une variante = une valeur possible pour un axe de choix (ex. axe "storage",
 * valeur "256 Go"). `price_delta` s'ajoute au prix de base du produit.
 */
export interface ProductVariant {
  id: string;
  product_id: string;
  kind: VariantKind;
  name: string;
  value: string;
  price_delta: number;
  stock: number;
  hex?: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  brand: string;
  category_id: string;
  price: number;
  sale_price: number | null;
  stock: number;
  low_stock_threshold: number;
  sku: string;
  warranty: string;
  condition: ProductCondition;
  rating: number;
  reviews_count: number;
  units_sold: number;
  is_active: boolean;
  is_featured: boolean;
  return_policy: string;
  shipping_note: string;
  included_accessories: string[];
  specs: SpecEntry[];
  /** Attributs filtrables normalisés (section 5). */
  storage_gb?: number | null;
  ram_gb?: number | null;
  screen_inches?: number | null;
  colors: string[];
  images: string[];
  variants: ProductVariant[];
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  author_first_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export type PromoType = 'percentage' | 'fixed';

export interface PromoCode {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  min_order: number;
  expiration_date: string;
  usage_limit: number;
  usage_count: number;
  is_active: boolean;
}

/** Une réduction appliquée à un panier, après validation du code. */
export interface AppliedPromo {
  code: string;
  type: PromoType;
  value: number;
  amount: number;
}

export interface CartLine {
  /** Identifiant de ligne = produit + combinaison de variantes choisie. */
  key: string;
  product_id: string;
  name: string;
  image: string;
  brand: string;
  unit_price: number;
  quantity: number;
  max_stock: number;
  /** Libellé lisible de la variante, ex. « Noir · 256 Go ». */
  variant_label: string | null;
  variant_ids: string[];
}

export type ShippingMethodId = 'standard' | 'express' | 'pickup';

export interface ShippingMethod {
  id: ShippingMethodId;
  label: string;
  description: string;
  price: number;
  eta: string;
  icon: string;
}

export type PaymentMethodId = 'card' | 'mobile_money' | 'cash_on_delivery' | 'paypal';

export interface PaymentMethod {
  id: PaymentMethodId;
  label: string;
  description: string;
  icon: string;
  /** Un moyen non disponible reste visible mais désactivé (architecture prête). */
  available: boolean;
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

/** Les 7 statuts de la section 10, dans l'ordre de la timeline. */
export type OrderStatus =
  | 'received'
  | 'payment_confirmed'
  | 'preparing'
  | 'shipped'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export interface ShippingAddress {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  country: string;
  instructions: string;
}

export interface SavedAddress extends ShippingAddress {
  id: string;
  label: string;
  is_default: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  name: string;
  image: string;
  variant_label: string | null;
  /** Identifiants de variantes, utilisés pour restituer le stock à l’annulation. */
  variant_ids?: string[];
  quantity: number;
  unit_price: number;
}

export interface OrderEvent {
  status: OrderStatus;
  date: string;
  note?: string;
}

export interface Order {
  id: string;
  reference: string;
  user_id: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethodId;
  shipping_method: ShippingMethodId;
  shipping_address: ShippingAddress;
  promo_code: string | null;
  tracking_number: string | null;
  eta: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  history: OrderEvent[];
  created_at: string;
}

export type NotificationKind =
  | 'order_confirmed'
  | 'status_change'
  | 'delivery'
  | 'promotion'
  | 'new_product'
  | 'price_drop';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  target?: string;
}

/* ---------- Filtres et tri du catalogue (section 5) ---------- */

export type SortOption =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'popular'
  | 'rating'
  | 'newest'
  | 'promo';

export interface ProductFilters {
  query: string;
  categoryIds: string[];
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  minRating: number | null;
  storageOptions: number[];
  ramOptions: number[];
  screenOptions: number[];
  colors: string[];
  sort: SortOption;
}

export const emptyFilters: ProductFilters = {
  query: '',
  categoryIds: [],
  brands: [],
  minPrice: null,
  maxPrice: null,
  inStockOnly: false,
  onSaleOnly: false,
  minRating: null,
  storageOptions: [],
  ramOptions: [],
  screenOptions: [],
  colors: [],
  sort: 'relevance',
};

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/* ---------- Statistiques administrateur (section 16) ---------- */

export interface SalesPoint {
  label: string;
  value: number;
}

export interface AdminStats {
  revenue: number;
  revenueToday: number;
  revenueMonth: number;
  ordersCount: number;
  ordersToday: number;
  pendingOrders: number;
  customersCount: number;
  unitsSold: number;
  outOfStockCount: number;
  lowStockCount: number;
  averageOrderValue: number;
  revenueByDay: SalesPoint[];
  revenueByMonth: SalesPoint[];
  ordersByDay: SalesPoint[];
  salesByCategory: SalesPoint[];
  topProducts: { product: Product; units: number; revenue: number }[];
  lowStockProducts: Product[];
}

export interface CustomerSummary {
  user: User;
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
}
