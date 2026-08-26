import AsyncStorage from '@react-native-async-storage/async-storage';

import { FREE_SHIPPING_THRESHOLD, getShippingMethod, PAGE_SIZE } from '../constants';
import { demoCategories } from '../demo/categories';
import { demoOrders } from '../demo/orders';
import { demoProducts } from '../demo/products';
import { demoPromoCodes } from '../demo/promos';
import { demoReviews } from '../demo/reviews';
import { DEMO_CREDENTIALS, demoUsers } from '../demo/users';
import { applyPromo, normalizeCode } from '../promo';
import { effectivePrice } from '@/utils/format';
import { checkPassword, isValidEmail, isValidPhone, titleCaseName } from '@/utils/validation';
import {
  AuthSession,
  CategoryDraft,
  CreateOrderPayload,
  Facets,
  ProductDraft,
  PromoDraft,
  Repository,
  RepositoryError,
  SignUpPayload,
} from '../repository';
import { invalidateSearchIndex, queryProducts } from '../search';
import { computeStats } from '../stats';
import {
  AdminStats,
  Category,
  CustomerSummary,
  Order,
  OrderStatus,
  Paginated,
  Product,
  ProductFilters,
  PromoCode,
  Review,
  User,
  UserRole,
} from '../types';

const STORAGE_KEY = 'techstore.demo.state.v3';
const SESSION_KEY = 'techstore.demo.session.v1';

/**
 * Hachage volontairement simple : le mode démonstration fonctionne hors ligne
 * et ne doit stocker aucun mot de passe en clair. En production, c'est Supabase
 * Auth (bcrypt côté serveur) qui prend le relais — voir `providers/supabase.ts`.
 */
const demoHash = (password: string): string => {
  let hash = 5381;
  for (let i = 0; i < password.length; i += 1) {
    hash = ((hash << 5) + hash + password.charCodeAt(i)) & 0xffffffff;
  }
  return `demo$${(hash >>> 0).toString(36)}$${password.length}`;
};

interface PersistedState {
  products: Product[];
  categories: Category[];
  orders: Order[];
  users: User[];
  reviews: Review[];
  promos: PromoCode[];
  credentials: Record<string, string>;
  favorites: Record<string, string[]>;
  resetCodes: Record<string, string>;
  orderSequence: number;
}

const seedState = (): PersistedState => ({
  products: demoProducts.map((p) => ({ ...p })),
  categories: demoCategories.map((c) => ({ ...c })),
  orders: demoOrders.map((o) => ({ ...o })),
  users: demoUsers.map((u) => ({ ...u })),
  reviews: demoReviews.map((r) => ({ ...r })),
  promos: demoPromoCodes.map((p) => ({ ...p })),
  credentials: {
    [DEMO_CREDENTIALS.admin.email]: demoHash(DEMO_CREDENTIALS.admin.password),
    [DEMO_CREDENTIALS.customer.email]: demoHash(DEMO_CREDENTIALS.customer.password),
  },
  favorites: {
    'user-demo': ['airpods-pro-2', 'macbook-pro-14-m4', 'logitech-mx-master-3s'],
  },
  resetCodes: {},
  orderSequence: 24090,
});

/** Petit délai pour que les écrans de chargement soient réellement traversés. */
const tick = (ms = 90) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const round = (value: number) => Math.round(value * 100) / 100;

export class LocalRepository implements Repository {
  readonly mode = 'demo' as const;

  private state: PersistedState = seedState();
  private hydrated = false;
  private session: AuthSession | null = null;
  private idempotentOrders = new Map<string, string>();

  private async hydrate(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        // Fusion prudente : une nouvelle version du catalogue de démonstration
        // ne doit pas être écrasée par un état persisté incomplet.
        this.state = { ...seedState(), ...parsed };
      }
    } catch {
      this.state = seedState();
    }
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Le mode démonstration reste utilisable même si le stockage échoue.
    }
  }

  /** Remet le catalogue, les commandes et les comptes à leur état d'origine. */
  async resetDemoData(): Promise<void> {
    this.state = seedState();
    invalidateSearchIndex();
    await AsyncStorage.multiRemove([STORAGE_KEY, SESSION_KEY]);
    this.session = null;
    await this.persist();
  }

  /* ------------------------------------------------------------ Catalogue */

  async getCategories(): Promise<Category[]> {
    await this.hydrate();
    return clone(this.state.categories).sort((a, b) => a.position - b.position);
  }

  async getProducts(
    filters: ProductFilters,
    page = 1,
    pageSize = PAGE_SIZE,
  ): Promise<Paginated<Product>> {
    await this.hydrate();
    await tick(60);

    const matched = queryProducts(this.state.products, filters);
    const start = (page - 1) * pageSize;
    const items = matched.slice(start, start + pageSize);

    return {
      items: clone(items),
      total: matched.length,
      page,
      pageSize,
      hasMore: start + pageSize < matched.length,
    };
  }

  async getProductById(id: string): Promise<Product | null> {
    await this.hydrate();
    const found = this.state.products.find((p) => p.id === id);
    return found ? clone(found) : null;
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    await this.hydrate();
    const set = new Set(ids);
    return clone(this.state.products.filter((p) => set.has(p.id)));
  }

  async getRelatedProducts(productId: string, limit = 8): Promise<Product[]> {
    await this.hydrate();
    const reference = this.state.products.find((p) => p.id === productId);
    if (!reference) return [];

    const sameCategory = this.state.products.filter(
      (p) => p.id !== productId && p.category_id === reference.category_id && p.is_active,
    );

    const sameBrand = this.state.products.filter(
      (p) =>
        p.id !== productId &&
        p.category_id !== reference.category_id &&
        p.brand === reference.brand &&
        p.is_active,
    );

    return clone([...sameCategory, ...sameBrand].slice(0, limit));
  }

  async getFacets(): Promise<Facets> {
    await this.hydrate();
    const active = this.state.products.filter((p) => p.is_active);

    const numeric = (values: (number | null | undefined)[]) =>
      Array.from(new Set(values.filter((v): v is number => typeof v === 'number'))).sort(
        (a, b) => a - b,
      );

    const prices = active.map((p) =>
      p.sale_price && p.sale_price < p.price ? p.sale_price : p.price,
    );

    return {
      brands: Array.from(new Set(active.map((p) => p.brand))).sort((a, b) =>
        a.localeCompare(b, 'fr'),
      ),
      storages: numeric(active.map((p) => p.storage_gb)),
      rams: numeric(active.map((p) => p.ram_gb)),
      screens: numeric(active.map((p) => p.screen_inches)),
      colors: Array.from(new Set(active.flatMap((p) => p.colors))).sort((a, b) =>
        a.localeCompare(b, 'fr'),
      ),
      priceRange: {
        min: prices.length ? Math.floor(Math.min(...prices)) : 0,
        max: prices.length ? Math.ceil(Math.max(...prices)) : 0,
      },
    };
  }

  /* ----------------------------------------------------------------- Avis */

  async getReviews(productId: string): Promise<Review[]> {
    await this.hydrate();
    return clone(
      this.state.reviews
        .filter((r) => r.product_id === productId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    );
  }

  async addReview(input: {
    product_id: string;
    user_id: string;
    author_first_name: string;
    rating: number;
    comment: string;
  }): Promise<Review> {
    await this.hydrate();

    const review: Review = {
      id: `review-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...input,
    };

    this.state.reviews.unshift(review);

    // La note du produit est recalculée à partir de tous ses avis.
    const product = this.state.products.find((p) => p.id === input.product_id);
    if (product) {
      const all = this.state.reviews.filter((r) => r.product_id === product.id);
      product.reviews_count = all.length;
      product.rating =
        Math.round((all.reduce((sum, r) => sum + r.rating, 0) / all.length) * 10) / 10;
    }

    await this.persist();
    return clone(review);
  }

  /* --------------------------------------------------------- Authentification */

  async signIn(email: string, password: string): Promise<AuthSession> {
    await this.hydrate();
    await tick(200);

    const normalized = email.trim().toLowerCase();
    const user = this.state.users.find((u) => u.email.toLowerCase() === normalized);
    const expected = this.state.credentials[normalized];

    if (!user || !expected || expected !== demoHash(password)) {
      throw new RepositoryError('Email ou mot de passe incorrect.', 'invalid_credentials');
    }

    const session: AuthSession = { user: clone(user), token: `demo-token-${user.id}` };
    this.session = session;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async signUp(payload: SignUpPayload): Promise<AuthSession> {
    await this.hydrate();
    await tick(220);

    const firstName = titleCaseName(payload.first_name);
    const lastName = titleCaseName(payload.last_name);
    const email = payload.email.trim().toLowerCase();
    const phone = payload.phone.trim();

    if (!firstName || !lastName) {
      throw new RepositoryError('Indiquez votre prénom et votre nom.', 'unknown');
    }
    if (!isValidEmail(email)) {
      throw new RepositoryError('Adresse email invalide.', 'unknown');
    }
    if (!isValidPhone(phone)) {
      throw new RepositoryError('Numéro de téléphone invalide.', 'unknown');
    }

    const password = checkPassword(payload.password);
    if (!password.valid) {
      throw new RepositoryError(password.message ?? 'Mot de passe trop faible.', 'invalid_password');
    }

    if (this.state.users.some((u) => u.email.toLowerCase() === email)) {
      throw new RepositoryError('Un compte existe déjà avec cet email.', 'email_taken');
    }

    const user: User = {
      id: `user-${Date.now()}`,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      role: 'customer',
      avatar_url: null,
      created_at: new Date().toISOString(),
    };

    this.state.users.push(user);
    this.state.credentials[email] = demoHash(payload.password);

    // Les commandes passées en invité avec le même email sont rattachées au compte.
    this.state.orders = this.state.orders.map((order) =>
      !order.user_id && order.customer_email.toLowerCase() === email
        ? { ...order, user_id: user.id }
        : order,
    );

    await this.persist();

    const session: AuthSession = { user: clone(user), token: `demo-token-${user.id}` };
    this.session = session;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async signOut(): Promise<void> {
    this.session = null;
    await AsyncStorage.removeItem(SESSION_KEY);
  }

  async restoreSession(): Promise<AuthSession | null> {
    await this.hydrate();
    if (this.session) return this.session;

    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) return null;

      const stored = JSON.parse(raw) as AuthSession;
      // Le profil peut avoir changé depuis : on repart de la source de vérité.
      const fresh = this.state.users.find((u) => u.id === stored.user.id);
      if (!fresh) return null;

      this.session = { user: clone(fresh), token: stored.token };
      return this.session;
    } catch {
      return null;
    }
  }

  async requestPasswordReset(email: string): Promise<{ delivered: boolean; hint?: string }> {
    await this.hydrate();
    await tick(240);

    const normalized = email.trim().toLowerCase();
    const exists = this.state.users.some((u) => u.email.toLowerCase() === normalized);

    // On ne révèle jamais si l'email existe : réponse identique dans les deux cas.
    if (!exists) return { delivered: true };

    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.state.resetCodes[normalized] = code;
    await this.persist();

    return {
      delivered: true,
      hint: `Mode démonstration : aucun email n’est envoyé. Votre code est ${code}.`,
    };
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await this.hydrate();

    const normalized = email.trim().toLowerCase();

    if (this.state.resetCodes[normalized] !== code.trim()) {
      throw new RepositoryError('Code de vérification invalide.', 'invalid_credentials');
    }

    this.state.credentials[normalized] = demoHash(newPassword);
    delete this.state.resetCodes[normalized];
    await this.persist();
  }

  async updateProfile(userId: string, patch: Partial<User>): Promise<User> {
    await this.hydrate();

    const user = this.state.users.find((u) => u.id === userId);
    if (!user) throw new RepositoryError('Compte introuvable.', 'not_found');

    // Le rôle ne peut jamais être modifié depuis l'écran de profil client.
    const { role: _ignoredRole, id: _ignoredId, ...safe } = patch;
    Object.assign(user, safe);

    await this.persist();

    if (this.session?.user.id === userId) {
      this.session = { ...this.session, user: clone(user) };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    }

    return clone(user);
  }

  /* -------------------------------------------------------------- Favoris */

  async getFavorites(userId: string): Promise<string[]> {
    await this.hydrate();
    return [...(this.state.favorites[userId] ?? [])];
  }

  async setFavorite(userId: string, productId: string, favorite: boolean): Promise<void> {
    await this.hydrate();

    const current = new Set(this.state.favorites[userId] ?? []);
    if (favorite) current.add(productId);
    else current.delete(productId);

    this.state.favorites[userId] = Array.from(current);
    await this.persist();
  }

  /* ---------------------------------------------------------- Codes promo */

  async validatePromoCode(code: string, subtotal: number) {
    await this.hydrate();
    await tick(150);

    const promo = this.state.promos.find((p) => p.code === normalizeCode(code));
    return applyPromo(promo, subtotal);
  }

  /* ------------------------------------------------------------ Commandes */

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    await this.hydrate();
    await tick(320);

    if (payload.payment_method === 'paypal') {
      throw new RepositoryError('Moyen de paiement invalide.', 'unknown');
    }

    if (payload.idempotency_key) {
      const existingRef = this.idempotentOrders.get(payload.idempotency_key);
      const existing = existingRef
        ? this.state.orders.find((order) => order.reference === existingRef)
        : undefined;
      if (existing) return clone(existing);
    }

    const priced = payload.items.map((item) => {
      const product = this.state.products.find((p) => p.id === item.product_id && p.is_active);
      if (!product) {
        throw new RepositoryError(`« ${item.name} » n’est plus disponible.`, 'not_found');
      }

      const quantity = item.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        throw new RepositoryError('Quantité invalide.', 'unknown');
      }

      const variants = (item.variant_ids ?? []).map((id) => {
        const variant = product.variants.find((entry) => entry.id === id);
        if (!variant) throw new RepositoryError('Variante invalide.', 'unknown');
        if (variant.stock < quantity) {
          throw new RepositoryError(
            `Il ne reste pas assez de stock pour « ${product.name} ».`,
            'out_of_stock',
          );
        }
        return variant;
      });

      if (product.stock < quantity) {
        throw new RepositoryError(
          product.stock === 0
            ? `« ${product.name} » est en rupture de stock.`
            : `Il ne reste que ${product.stock} unité(s) de « ${product.name} ».`,
          'out_of_stock',
        );
      }

      const unit_price = round(
        effectivePrice(product.price, product.sale_price) +
          variants.reduce((sum, variant) => sum + variant.price_delta, 0),
      );

      return {
        product,
        variants,
        quantity,
        unit_price,
        variant_ids: variants.map((variant) => variant.id),
        variant_label: variants.length ? variants.map((variant) => variant.value).join(' · ') : null,
      };
    });

    const subtotal = round(priced.reduce((sum, line) => sum + line.unit_price * line.quantity, 0));

    let discount = 0;
    let promoCode: string | null = null;
    if (payload.promo_code) {
      const promo = this.state.promos.find((entry) => entry.code === normalizeCode(payload.promo_code!));
      const applied = applyPromo(promo, subtotal);
      discount = applied.amount;
      promoCode = applied.code;
    }

    const shippingMethod = getShippingMethod(payload.shipping_method);
    const shipping_cost =
      payload.shipping_method === 'pickup'
        ? 0
        : payload.shipping_method === 'standard' && subtotal >= FREE_SHIPPING_THRESHOLD
          ? 0
          : shippingMethod.price;

    this.state.orderSequence += 1;
    const reference = `BAB-${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`.toUpperCase();
    const now = new Date().toISOString();

    const order: Order = {
      id: reference,
      reference,
      user_id: this.session?.user.id ?? null,
      items: priced.map((line, index) => ({
        id: `${reference}-item-${index}`,
        order_id: reference,
        product_id: line.product.id,
        name: line.product.name,
        image: line.product.images[0] ?? '',
        variant_label: line.variant_label,
        variant_ids: line.variant_ids,
        quantity: line.quantity,
        unit_price: line.unit_price,
      })),
      subtotal,
      shipping_cost,
      discount,
      total: round(Math.max(0, subtotal - discount + shipping_cost)),
      status: 'received',
      payment_status: 'pending',
      payment_method: payload.payment_method,
      shipping_method: payload.shipping_method,
      shipping_address: payload.shipping_address,
      promo_code: promoCode,
      tracking_number: null,
      eta: shippingMethod.eta,
      customer_name: `${payload.shipping_address.first_name} ${payload.shipping_address.last_name}`,
      customer_phone: payload.shipping_address.phone,
      customer_email: payload.shipping_address.email.trim().toLowerCase(),
      history: [{ status: 'received', date: now, note: 'Commande enregistrée' }],
      created_at: now,
    };

    priced.forEach((line) => {
      line.product.stock -= line.quantity;
      line.product.units_sold += line.quantity;
      line.variants.forEach((variant) => {
        variant.stock -= line.quantity;
      });
    });

    if (promoCode) {
      const promo = this.state.promos.find((entry) => entry.code === promoCode);
      if (promo) promo.usage_count += 1;
    }

    this.state.orders.unshift(order);
    if (payload.idempotency_key) this.idempotentOrders.set(payload.idempotency_key, order.reference);
    await this.persist();
    return clone(order);
  }

  async getOrders(userId: string): Promise<Order[]> {
    await this.hydrate();
    await tick(120);

    return clone(
      this.state.orders
        .filter((o) => o.user_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    );
  }

  async getOrderByReference(reference: string, email?: string | null): Promise<Order | null> {
    await this.hydrate();
    const found = this.state.orders.find(
      (o) => o.reference.toUpperCase() === reference.trim().toUpperCase(),
    );
    if (!found) return null;

    const user = this.session?.user;
    if (user?.role === 'admin' || (user && found.user_id === user.id)) {
      return clone(found);
    }

    const needle = email?.trim().toLowerCase();
    if (needle && found.customer_email.toLowerCase() === needle) {
      return clone(found);
    }

    return null;
  }

  /* ------------------------------------------------------- Administration */

  async adminListOrders(search = '', status: OrderStatus | 'all' = 'all'): Promise<Order[]> {
    await this.hydrate();
    await tick(120);

    const needle = search.trim().toLowerCase();

    return clone(
      this.state.orders
        .filter((order) => {
          if (status !== 'all' && order.status !== status) return false;
          if (!needle) return true;

          return (
            order.reference.toLowerCase().includes(needle) ||
            order.customer_name.toLowerCase().includes(needle) ||
            order.customer_phone.replace(/\s/g, '').includes(needle.replace(/\s/g, '')) ||
            order.customer_email.toLowerCase().includes(needle)
          );
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    );
  }

  private findOrder(reference: string): Order {
    const order = this.state.orders.find((o) => o.reference === reference);
    if (!order) throw new RepositoryError('Commande introuvable.', 'not_found');
    return order;
  }

  async adminUpdateOrderStatus(
    reference: string,
    status: OrderStatus,
    note?: string,
  ): Promise<Order> {
    await this.hydrate();

    const order = this.findOrder(reference);
    const previous = order.status;
    order.status = status;
    order.history.push({ status, date: new Date().toISOString(), note });

    if (status === 'delivered' && order.payment_method === 'cash_on_delivery') {
      order.payment_status = 'paid';
    }

    if (status === 'cancelled' && previous !== 'cancelled') {
      order.items.forEach((item) => {
        const product = this.state.products.find((p) => p.id === item.product_id);
        if (product) {
          product.stock += item.quantity;
          product.units_sold = Math.max(0, product.units_sold - item.quantity);
        }
        (item.variant_ids ?? []).forEach((variantId) => {
          const variant = product?.variants.find((entry) => entry.id === variantId);
          if (variant) variant.stock += item.quantity;
        });
      });

      if (order.payment_status === 'paid') order.payment_status = 'refunded';
    }

    await this.persist();
    return clone(order);
  }

  async adminSetTrackingNumber(reference: string, tracking: string): Promise<Order> {
    await this.hydrate();

    const order = this.findOrder(reference);
    order.tracking_number = tracking.trim() || null;
    await this.persist();
    return clone(order);
  }

  async adminConfirmPayment(reference: string): Promise<Order> {
    await this.hydrate();

    const order = this.findOrder(reference);
    order.payment_status = 'paid';

    if (order.status === 'received') {
      order.status = 'payment_confirmed';
      order.history.push({
        status: 'payment_confirmed',
        date: new Date().toISOString(),
        note: 'Paiement confirmé manuellement',
      });
    }

    await this.persist();
    return clone(order);
  }

  async adminSaveProduct(draft: ProductDraft): Promise<Product> {
    await this.hydrate();

    if (draft.id) {
      const existing = this.state.products.find((p) => p.id === draft.id);
      if (!existing) throw new RepositoryError('Produit introuvable.', 'not_found');

      Object.assign(existing, draft);
      invalidateSearchIndex(existing.id);
      await this.persist();
      return clone(existing);
    }

    const product: Product = {
      ...draft,
      id: `product-${Date.now()}`,
      rating: 0,
      reviews_count: 0,
      units_sold: 0,
      created_at: new Date().toISOString(),
    };

    this.state.products.unshift(product);
    invalidateSearchIndex(product.id);
    await this.persist();
    return clone(product);
  }

  async adminDeleteProduct(id: string): Promise<void> {
    await this.hydrate();
    this.state.products = this.state.products.filter((p) => p.id !== id);
    this.state.reviews = this.state.reviews.filter((r) => r.product_id !== id);
    invalidateSearchIndex(id);
    await this.persist();
  }

  async adminSetStock(id: string, stock: number): Promise<Product> {
    await this.hydrate();

    const product = this.state.products.find((p) => p.id === id);
    if (!product) throw new RepositoryError('Produit introuvable.', 'not_found');

    product.stock = Math.max(0, Math.round(stock));
    await this.persist();
    return clone(product);
  }

  async adminSaveCategory(draft: CategoryDraft): Promise<Category> {
    await this.hydrate();

    if (draft.id) {
      const existing = this.state.categories.find((c) => c.id === draft.id);
      if (!existing) throw new RepositoryError('Catégorie introuvable.', 'not_found');

      Object.assign(existing, draft);
      await this.persist();
      return clone(existing);
    }

    const slug =
      draft.slug ||
      draft.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const category: Category = {
      ...draft,
      slug,
      id: slug || `category-${Date.now()}`,
      position: this.state.categories.length + 1,
    };

    this.state.categories.push(category);
    await this.persist();
    return clone(category);
  }

  async adminDeleteCategory(id: string): Promise<void> {
    await this.hydrate();

    const used = this.state.products.some((p) => p.category_id === id);
    if (used) {
      throw new RepositoryError(
        'Cette catégorie contient encore des produits. Déplacez-les avant de la supprimer.',
        'forbidden',
      );
    }

    this.state.categories = this.state.categories.filter((c) => c.id !== id);
    await this.persist();
  }

  async adminReorderCategories(orderedIds: string[]): Promise<Category[]> {
    await this.hydrate();

    orderedIds.forEach((id, index) => {
      const category = this.state.categories.find((c) => c.id === id);
      if (category) category.position = index + 1;
    });

    await this.persist();
    return clone(this.state.categories).sort((a, b) => a.position - b.position);
  }

  async adminListPromos(): Promise<PromoCode[]> {
    await this.hydrate();
    return clone(this.state.promos);
  }

  async adminSavePromo(draft: PromoDraft): Promise<PromoCode> {
    await this.hydrate();

    const code = normalizeCode(draft.code);

    if (draft.id) {
      const existing = this.state.promos.find((p) => p.id === draft.id);
      if (!existing) throw new RepositoryError('Code promo introuvable.', 'not_found');

      Object.assign(existing, draft, { code });
      await this.persist();
      return clone(existing);
    }

    if (this.state.promos.some((p) => p.code === code)) {
      throw new RepositoryError('Ce code existe déjà.', 'forbidden');
    }

    const promo: PromoCode = {
      ...draft,
      code,
      id: `promo-${Date.now()}`,
      usage_count: 0,
    };

    this.state.promos.unshift(promo);
    await this.persist();
    return clone(promo);
  }

  async adminDeletePromo(id: string): Promise<void> {
    await this.hydrate();
    this.state.promos = this.state.promos.filter((p) => p.id !== id);
    await this.persist();
  }

  async adminListCustomers(search = ''): Promise<CustomerSummary[]> {
    await this.hydrate();
    await tick(120);

    const needle = search.trim().toLowerCase();

    return this.state.users
      .filter((user) => {
        if (user.role !== 'customer') return false;
        if (!needle) return true;

        return (
          `${user.first_name} ${user.last_name}`.toLowerCase().includes(needle) ||
          user.email.toLowerCase().includes(needle) ||
          user.phone.replace(/\s/g, '').includes(needle.replace(/\s/g, ''))
        );
      })
      .map((user) => {
        const orders = this.state.orders.filter(
          (o) => o.user_id === user.id && o.status !== 'cancelled',
        );

        return {
          user: clone(user),
          orders_count: orders.length,
          total_spent: round(orders.reduce((sum, o) => sum + o.total, 0)),
          last_order_at: orders.length
            ? orders
                .map((o) => o.created_at)
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
            : null,
        };
      })
      .sort((a, b) => b.total_spent - a.total_spent);
  }

  async adminGetStats(): Promise<AdminStats> {
    await this.hydrate();
    await tick(160);

    return computeStats(
      this.state.orders,
      this.state.products,
      this.state.categories,
      this.state.users,
    );
  }

  async adminSetUserRole(userId: string, role: UserRole): Promise<User> {
    await this.hydrate();

    const user = this.state.users.find((u) => u.id === userId);
    if (!user) throw new RepositoryError('Compte introuvable.', 'not_found');

    user.role = role;
    await this.persist();
    return clone(user);
  }
}
