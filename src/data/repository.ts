import {
  AdminStats,
  AppliedPromo,
  Category,
  CustomerSummary,
  Order,
  OrderStatus,
  Paginated,
  PaymentMethodId,
  Product,
  ProductFilters,
  PromoCode,
  Review,
  ShippingAddress,
  ShippingMethodId,
  User,
  UserRole,
} from './types';

export interface Facets {
  brands: string[];
  storages: number[];
  rams: number[];
  screens: number[];
  colors: string[];
  priceRange: { min: number; max: number };
}

export interface AuthSession {
  user: User;
  /** Jeton opaque. En mode Supabase, il s'agit du jeton d'accès JWT. */
  token: string;
}

export interface SignUpPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
}

export interface CreateOrderPayload {
  user_id: string | null;
  items: {
    product_id: string;
    name: string;
    image: string;
    variant_label: string | null;
    quantity: number;
    unit_price: number;
  }[];
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  shipping_method: ShippingMethodId;
  payment_method: PaymentMethodId;
  shipping_address: ShippingAddress;
  promo_code: string | null;
}

export type ProductDraft = Omit<
  Product,
  'id' | 'created_at' | 'rating' | 'reviews_count' | 'units_sold'
> & { id?: string };

export type PromoDraft = Omit<PromoCode, 'id' | 'usage_count'> & { id?: string };

export type CategoryDraft = Omit<Category, 'id'> & { id?: string };

/**
 * Contrat unique d'accès aux données. Les écrans ne dépendent que de cette
 * interface : basculer des données de démonstration vers Supabase ne change
 * aucun composant.
 */
export interface Repository {
  readonly mode: 'demo' | 'supabase';

  /* --- Catalogue --- */
  getCategories(): Promise<Category[]>;
  getProducts(
    filters: ProductFilters,
    page?: number,
    pageSize?: number,
  ): Promise<Paginated<Product>>;
  getProductById(id: string): Promise<Product | null>;
  getProductsByIds(ids: string[]): Promise<Product[]>;
  getRelatedProducts(productId: string, limit?: number): Promise<Product[]>;
  getFacets(): Promise<Facets>;

  /* --- Avis --- */
  getReviews(productId: string): Promise<Review[]>;
  addReview(input: {
    product_id: string;
    user_id: string;
    author_first_name: string;
    rating: number;
    comment: string;
  }): Promise<Review>;

  /* --- Authentification --- */
  signIn(email: string, password: string): Promise<AuthSession>;
  signUp(payload: SignUpPayload): Promise<AuthSession>;
  signOut(): Promise<void>;
  restoreSession(): Promise<AuthSession | null>;
  requestPasswordReset(email: string): Promise<{ delivered: boolean; hint?: string }>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
  updateProfile(userId: string, patch: Partial<User>): Promise<User>;

  /* --- Favoris --- */
  getFavorites(userId: string): Promise<string[]>;
  setFavorite(userId: string, productId: string, favorite: boolean): Promise<void>;

  /* --- Codes promo --- */
  validatePromoCode(code: string, subtotal: number): Promise<AppliedPromo>;

  /* --- Commandes --- */
  createOrder(payload: CreateOrderPayload): Promise<Order>;
  getOrders(userId: string): Promise<Order[]>;
  getOrderByReference(reference: string): Promise<Order | null>;

  /* --- Administration --- */
  adminListOrders(search?: string, status?: OrderStatus | 'all'): Promise<Order[]>;
  adminUpdateOrderStatus(reference: string, status: OrderStatus, note?: string): Promise<Order>;
  adminSetTrackingNumber(reference: string, tracking: string): Promise<Order>;
  adminConfirmPayment(reference: string): Promise<Order>;
  adminSaveProduct(draft: ProductDraft): Promise<Product>;
  adminDeleteProduct(id: string): Promise<void>;
  adminSetStock(id: string, stock: number): Promise<Product>;
  adminSaveCategory(draft: CategoryDraft): Promise<Category>;
  adminDeleteCategory(id: string): Promise<void>;
  adminReorderCategories(orderedIds: string[]): Promise<Category[]>;
  adminListPromos(): Promise<PromoCode[]>;
  adminSavePromo(draft: PromoDraft): Promise<PromoCode>;
  adminDeletePromo(id: string): Promise<void>;
  adminListCustomers(search?: string): Promise<CustomerSummary[]>;
  adminGetStats(): Promise<AdminStats>;
  adminSetUserRole(userId: string, role: UserRole): Promise<User>;
}

/** Erreur métier destinée à être affichée telle quelle à l'utilisateur. */
export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'invalid_credentials'
      | 'email_taken'
      | 'email_confirmation'
      | 'invalid_password'
      | 'not_found'
      | 'out_of_stock'
      | 'invalid_promo'
      | 'forbidden'
      | 'network'
      | 'unknown' = 'unknown',
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}
