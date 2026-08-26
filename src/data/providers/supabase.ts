import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase';
import { effectivePrice } from '@/utils/format';
import { PAGE_SIZE } from '../constants';
import { demoCategories } from '../demo/categories';
import { demoProducts } from '../demo/products';
import { demoPromoCodes } from '../demo/promos';
import { normalizeCode } from '../promo';
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
import { queryProducts } from '../search';
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
  ProductVariant,
  PromoCode,
  AppliedPromo,
  Review,
  SortOption,
  User,
  UserRole,
} from '../types';

const PRODUCT_SELECT = '*, product_images(image_url, position), product_variants(*)';

const fail = (error: PostgrestError | { message: string } | null, fallback: string): never => {
  const message = error?.message ?? fallback;

  if (/JWT|permission|policy|denied/i.test(message)) {
    throw new RepositoryError('Vous n’avez pas les droits pour cette action.', 'forbidden');
  }
  if (/fetch|network|timeout/i.test(message)) {
    throw new RepositoryError('Connexion impossible. Vérifiez votre réseau.', 'network');
  }

  throw new RepositoryError(message, 'unknown');
};

/** Neutralise les métacaractères PostgREST / LIKE dans un filtre `ilike`. */
const ilikePattern = (value: string): string | null => {
  const cleaned = value
    .replace(/[%_,.()\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

  return cleaned ? `%${cleaned}%` : null;
};

/* --------------------------------------------------------------- mapping --- */

interface ProductRow {
  product_images?: { image_url: string; position: number }[] | null;
  product_variants?: ProductVariant[] | null;
  [key: string]: unknown;
}

const rowToProduct = (row: ProductRow): Product => {
  const images = (row.product_images ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((image) => image.image_url);

  const { product_images: _images, product_variants: variants, ...rest } = row;

  return {
    ...(rest as unknown as Omit<Product, 'images' | 'variants'>),
    price: Number(rest.price),
    sale_price: rest.sale_price === null ? null : Number(rest.sale_price),
    rating: Number(rest.rating ?? 0),
    screen_inches: rest.screen_inches === null ? null : Number(rest.screen_inches),
    images,
    variants: (variants ?? []).map((variant) => ({
      ...variant,
      price_delta: Number(variant.price_delta),
    })),
  };
};

/** Sépare le produit de ses tables liées avant écriture. */
const productToRow = (product: Product | ProductDraft) => {
  const { images: _images, variants: _variants, ...row } = product as Product;
  return row;
};

const rowToOrder = (row: Record<string, any>): Order => ({
  ...(row as Order),
  subtotal: Number(row.subtotal),
  shipping_cost: Number(row.shipping_cost),
  discount: Number(row.discount),
  total: Number(row.total),
  items: (row.order_items ?? []).map((item: Record<string, any>) => ({
    ...item,
    unit_price: Number(item.unit_price),
    variant_ids: Array.isArray(item.variant_ids) ? item.variant_ids : [],
  })),
});

const parseStoreOrder = (payload: unknown): Order | null => {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as { order?: Record<string, any>; items?: Record<string, any>[] };
  if (!body.order) return null;
  return rowToOrder({ ...body.order, order_items: body.items ?? [] });
};

const SORT_COLUMNS: Partial<Record<SortOption, { column: string; ascending: boolean }>> = {
  price_asc: { column: 'price', ascending: true },
  price_desc: { column: 'price', ascending: false },
  popular: { column: 'units_sold', ascending: false },
  rating: { column: 'rating', ascending: false },
  newest: { column: 'created_at', ascending: false },
};

export class SupabaseRepository implements Repository {
  readonly mode = 'supabase' as const;

  private get db(): SupabaseClient {
    return getSupabase();
  }

  /* ------------------------------------------------------------ Catalogue */

  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.db
      .from('categories')
      .select('*')
      .order('position', { ascending: true });

    if (error) fail(error, 'Impossible de charger les catégories.');
    return (data ?? []) as Category[];
  }

  async getProducts(
    filters: ProductFilters,
    page = 1,
    pageSize = PAGE_SIZE,
  ): Promise<Paginated<Product>> {
    // Avec un terme de recherche, on récupère un lot de candidats via `ilike`
    // puis on applique le scoring de pertinence local (section 29). Sans terme,
    // filtrage, tri et pagination se font entièrement côté serveur.
    if (filters.query.trim()) {
      const term = ilikePattern(filters.query);

      const { data, error } = await this.db
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('is_active', true)
        .or(
          term
            ? `name.ilike.${term},brand.ilike.${term},description.ilike.${term},sku.ilike.${term}`
            : 'is_active.eq.true',
        )
        .limit(200);

      if (error) fail(error, 'La recherche a échoué.');

      const matched = queryProducts((data ?? []).map(rowToProduct), filters);
      const start = (page - 1) * pageSize;

      return {
        items: matched.slice(start, start + pageSize),
        total: matched.length,
        page,
        pageSize,
        hasMore: start + pageSize < matched.length,
      };
    }

    let query = this.db
      .from('products')
      .select(PRODUCT_SELECT, { count: 'exact' })
      .eq('is_active', true);

    if (filters.categoryIds.length) query = query.in('category_id', filters.categoryIds);
    if (filters.brands.length) query = query.in('brand', filters.brands);
    if (filters.inStockOnly) query = query.gt('stock', 0);
    if (filters.onSaleOnly) query = query.not('sale_price', 'is', null);
    if (filters.minRating !== null) query = query.gte('rating', filters.minRating);
    if (filters.minPrice !== null) query = query.gte('price', filters.minPrice);
    if (filters.maxPrice !== null) query = query.lte('price', filters.maxPrice);
    if (filters.storageOptions.length) query = query.in('storage_gb', filters.storageOptions);
    if (filters.ramOptions.length) query = query.in('ram_gb', filters.ramOptions);
    if (filters.colors.length) query = query.overlaps('colors', filters.colors);

    const sort = SORT_COLUMNS[filters.sort];
    query = sort
      ? query.order(sort.column, { ascending: sort.ascending })
      : query.order('units_sold', { ascending: false });

    const start = (page - 1) * pageSize;
    const { data, error, count } = await query.range(start, start + pageSize - 1);

    if (error) fail(error, 'Impossible de charger les produits.');

    let items = (data ?? []).map(rowToProduct);

    // Le tri « Promotions » dépend du taux de remise, qui n'est pas une colonne.
    if (filters.sort === 'promo') {
      items = items.sort((a, b) => {
        const rate = (p: Product) =>
          p.sale_price && p.sale_price < p.price ? (p.price - p.sale_price) / p.price : 0;
        return rate(b) - rate(a);
      });
    }

    const total = count ?? items.length;

    return { items, total, page, pageSize, hasMore: start + pageSize < total };
  }

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await this.db
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) fail(error, 'Impossible de charger ce produit.');
    return data ? rowToProduct(data) : null;
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    if (!ids.length) return [];

    const { data, error } = await this.db.from('products').select(PRODUCT_SELECT).in('id', ids);

    if (error) fail(error, 'Impossible de charger ces produits.');
    return (data ?? []).map(rowToProduct);
  }

  async getRelatedProducts(productId: string, limit = 8): Promise<Product[]> {
    const product = await this.getProductById(productId);
    if (!product) return [];

    const { data, error } = await this.db
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .eq('category_id', product.category_id)
      .neq('id', productId)
      .order('units_sold', { ascending: false })
      .limit(limit);

    if (error) fail(error, 'Impossible de charger les suggestions.');
    return (data ?? []).map(rowToProduct);
  }

  async getFacets(): Promise<Facets> {
    const { data, error } = await this.db
      .from('products')
      .select('brand, storage_gb, ram_gb, screen_inches, colors, price, sale_price')
      .eq('is_active', true);

    if (error) fail(error, 'Impossible de charger les filtres.');

    const rows = data ?? [];
    const numeric = (values: (number | null)[]) =>
      Array.from(new Set(values.filter((v): v is number => v !== null && v !== undefined))).sort(
        (a, b) => a - b,
      );

    const prices = rows.map((row) =>
      effectivePrice(Number(row.price), row.sale_price === null ? null : Number(row.sale_price)),
    );

    return {
      brands: Array.from(new Set(rows.map((row) => row.brand as string)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'fr')),
      storages: numeric(rows.map((row) => row.storage_gb as number | null)),
      rams: numeric(rows.map((row) => row.ram_gb as number | null)),
      screens: numeric(rows.map((row) => (row.screen_inches === null ? null : Number(row.screen_inches)))),
      colors: Array.from(new Set(rows.flatMap((row) => (row.colors as string[]) ?? []))).sort(
        (a, b) => a.localeCompare(b, 'fr'),
      ),
      priceRange: {
        min: prices.length ? Math.floor(Math.min(...prices)) : 0,
        max: prices.length ? Math.ceil(Math.max(...prices)) : 0,
      },
    };
  }

  /* ----------------------------------------------------------------- Avis */

  async getReviews(productId: string): Promise<Review[]> {
    const { data, error } = await this.db
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) fail(error, 'Impossible de charger les avis.');
    return (data ?? []) as Review[];
  }

  async addReview(input: {
    product_id: string;
    user_id: string;
    author_first_name: string;
    rating: number;
    comment: string;
  }): Promise<Review> {
    const { data, error } = await this.db.from('reviews').insert(input).select().single();

    if (error) fail(error, 'Impossible de publier votre avis.');
    return data as Review;
  }

  /* ------------------------------------------------------ Authentification */

  private async loadProfile(userId: string, fallbackEmail: string): Promise<User> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) fail(error, 'Impossible de charger votre profil.');

    if (!data) {
      // Le trigger de création de profil n'a pas encore abouti : profil minimal.
      return {
        id: userId,
        first_name: '',
        last_name: '',
        email: fallbackEmail,
        phone: '',
        role: 'customer',
        avatar_url: null,
        created_at: new Date().toISOString(),
      };
    }

    return data as User;
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.db.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.session) {
      throw new RepositoryError('Email ou mot de passe incorrect.', 'invalid_credentials');
    }

    return {
      user: await this.loadProfile(data.user.id, data.user.email ?? email),
      token: data.session.access_token,
    };
  }

  async signUp(payload: SignUpPayload): Promise<AuthSession> {
    const { data, error } = await this.db.auth.signUp({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      options: {
        data: {
          first_name: payload.first_name.trim(),
          last_name: payload.last_name.trim(),
          phone: payload.phone.trim(),
        },
      },
    });

    if (error) {
      throw new RepositoryError(
        'Inscription impossible. Si vous avez déjà un compte, connectez-vous.',
        'email_taken',
      );
    }

    if (!data.session || !data.user) {
      // Confirmation d'email activée dans le projet Supabase.
      throw new RepositoryError(
        'Compte créé. Confirmez votre email avant de vous connecter.',
        'email_confirmation',
      );
    }

    return {
      user: await this.loadProfile(data.user.id, data.user.email ?? payload.email),
      token: data.session.access_token,
    };
  }

  async signOut(): Promise<void> {
    await this.db.auth.signOut();
  }

  async restoreSession(): Promise<AuthSession | null> {
    const { data } = await this.db.auth.getSession();
    if (!data.session) return null;

    return {
      user: await this.loadProfile(data.session.user.id, data.session.user.email ?? ''),
      token: data.session.access_token,
    };
  }

  async requestPasswordReset(email: string): Promise<{ delivered: boolean; hint?: string }> {
    const { error } = await this.db.auth.resetPasswordForEmail(email.trim().toLowerCase());

    // On répond identiquement même en cas d'erreur pour ne pas révéler
    // si l'adresse existe dans la base.
    if (error && !/rate limit/i.test(error.message)) return { delivered: true };
    if (error) throw new RepositoryError('Trop de tentatives. Réessayez plus tard.', 'forbidden');

    return {
      delivered: true,
      hint: 'Un email contenant un code à 6 chiffres vient de vous être envoyé.',
    };
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const { error: verifyError } = await this.db.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'recovery',
    });

    if (verifyError) {
      throw new RepositoryError('Code de vérification invalide ou expiré.', 'invalid_credentials');
    }

    const { error } = await this.db.auth.updateUser({ password: newPassword });
    if (error) fail(error, 'Impossible de mettre à jour le mot de passe.');
  }

  async updateProfile(userId: string, patch: Partial<User>): Promise<User> {
    const { role: _role, id: _id, email: _email, created_at: _created, ...rest } = patch;
    const safe: Record<string, unknown> = { ...rest };

    if ('avatar_url' in rest) {
      const uri = rest.avatar_url;
      safe.avatar_url =
        typeof uri === 'string' && /^(https:\/\/|file:\/\/|content:)/i.test(uri) && !/javascript:/i.test(uri)
          ? uri.slice(0, 500)
          : null;
    }

    const { data, error } = await this.db
      .from('profiles')
      .update(safe)
      .eq('id', userId)
      .select()
      .single();

    if (error) fail(error, 'Impossible de mettre à jour le profil.');
    return data as User;
  }

  /* -------------------------------------------------------------- Favoris */

  async getFavorites(userId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('favorites')
      .select('product_id')
      .eq('user_id', userId);

    if (error) fail(error, 'Impossible de charger vos favoris.');
    return (data ?? []).map((row) => row.product_id as string);
  }

  async setFavorite(userId: string, productId: string, favorite: boolean): Promise<void> {
    if (favorite) {
      const { error } = await this.db
        .from('favorites')
        .upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id' });
      if (error) fail(error, 'Impossible d’ajouter ce favori.');
      return;
    }

    const { error } = await this.db
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) fail(error, 'Impossible de retirer ce favori.');
  }

  /* ---------------------------------------------------------- Codes promo */

  async validatePromoCode(code: string, subtotal: number) {
    const { data, error } = await this.db.rpc('validate_store_promo', {
      p_code: normalizeCode(code),
      p_subtotal: subtotal,
    });

    if (error) {
      throw new RepositoryError(
        /promo|minimum|limite/i.test(error.message)
          ? error.message
          : 'Ce code promo n’existe pas ou n’est plus actif.',
        'invalid_promo',
      );
    }

    const body = data as { code?: string; type?: AppliedPromo['type']; value?: number; amount?: number };
    if (!body?.code || body.amount == null) {
      throw new RepositoryError('Ce code promo n’existe pas ou n’est plus actif.', 'invalid_promo');
    }

    return {
      code: body.code,
      type: body.type === 'fixed' ? 'fixed' : 'percentage',
      value: Number(body.value),
      amount: Number(body.amount),
    } satisfies AppliedPromo;
  }

  /* ------------------------------------------------------------ Commandes */

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const { data, error } = await this.db.rpc('place_store_order', {
      p_order: {
        payment_method: payload.payment_method,
        shipping_method: payload.shipping_method,
        shipping_address: payload.shipping_address,
        promo_code: payload.promo_code,
        idempotency_key: payload.idempotency_key ?? null,
      },
      p_items: payload.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        variant_ids: item.variant_ids ?? [],
      })),
    });

    if (error) {
      if (/stock insuffisant|introuvable|Variante/i.test(error.message)) {
        throw new RepositoryError(
          'Un article n’est plus disponible en quantité suffisante.',
          'out_of_stock',
        );
      }
      if (/promo/i.test(error.message)) {
        throw new RepositoryError(error.message, 'invalid_promo');
      }
      if (/Trop de commandes/i.test(error.message)) {
        throw new RepositoryError('Trop de commandes. Réessayez plus tard.', 'forbidden');
      }
      fail(error, 'Impossible d’enregistrer la commande.');
    }

    const order = parseStoreOrder(data);
    if (!order) fail({ message: 'empty' }, 'Impossible d’enregistrer la commande.');
    return order;
  }

  async getOrders(userId: string): Promise<Order[]> {
    const { data, error } = await this.db
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) fail(error, 'Impossible de charger vos commandes.');
    return (data ?? []).map(rowToOrder);
  }

  async getOrderByReference(reference: string, email?: string | null): Promise<Order | null> {
    const { data, error } = await this.db.rpc('lookup_store_order', {
      p_reference: reference.trim(),
      p_email: email?.trim() || null,
    });

    if (error) fail(error, 'Impossible de charger cette commande.');
    return parseStoreOrder(data);
  }

  /* ------------------------------------------------------- Administration */

  async adminListOrders(search = '', status: OrderStatus | 'all' = 'all'): Promise<Order[]> {
    let query = this.db.from('orders').select('*, order_items(*)');

    if (status !== 'all') query = query.eq('status', status);

    const term = ilikePattern(search);
    if (term) {
      query = query.or(
        `reference.ilike.${term},customer_name.ilike.${term},customer_phone.ilike.${term},customer_email.ilike.${term}`,
      );
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(200);

    if (error) fail(error, 'Impossible de charger les commandes.');
    return (data ?? []).map(rowToOrder);
  }

  private async patchOrder(reference: string, patch: Record<string, unknown>): Promise<Order> {
    const { data, error } = await this.db
      .from('orders')
      .update(patch)
      .eq('reference', reference)
      .select('*, order_items(*)')
      .single();

    if (error) fail(error, 'Mise à jour impossible.');
    return rowToOrder(data as Record<string, any>);
  }

  async adminUpdateOrderStatus(
    reference: string,
    status: OrderStatus,
    note?: string,
  ): Promise<Order> {
    const current = await this.getOrderByReference(reference);
    if (!current) throw new RepositoryError('Commande introuvable.', 'not_found');

    const history = [...current.history, { status, date: new Date().toISOString(), note }];
    const patch: Record<string, unknown> = { status, history };

    if (status === 'delivered' && current.payment_method === 'cash_on_delivery') {
      patch.payment_status = 'paid';
    }

    if (status === 'cancelled' && current.status !== 'cancelled') {
      const { data, error } = await this.db.rpc('admin_cancel_store_order', {
        p_reference: reference,
        p_note: note ?? null,
      });
      if (error) fail(error, 'Impossible d’annuler cette commande.');
      const cancelled = parseStoreOrder(data);
      if (!cancelled) fail({ message: 'empty' }, 'Impossible d’annuler cette commande.');
      return cancelled;
    }

    return this.patchOrder(reference, patch);
  }

  async adminSetTrackingNumber(reference: string, tracking: string): Promise<Order> {
    return this.patchOrder(reference, { tracking_number: tracking.trim() || null });
  }

  async adminConfirmPayment(reference: string): Promise<Order> {
    const current = await this.getOrderByReference(reference);
    if (!current) throw new RepositoryError('Commande introuvable.', 'not_found');

    const patch: Record<string, unknown> = { payment_status: 'paid' };

    if (current.status === 'received') {
      patch.status = 'payment_confirmed';
      patch.history = [
        ...current.history,
        {
          status: 'payment_confirmed',
          date: new Date().toISOString(),
          note: 'Paiement confirmé manuellement',
        },
      ];
    }

    return this.patchOrder(reference, patch);
  }

  async adminSaveProduct(draft: ProductDraft): Promise<Product> {
    const id = draft.id ?? `product-${Date.now()}`;
    const row = { ...productToRow(draft as Product), id };

    const { error } = await this.db.from('products').upsert(row);
    if (error) fail(error, 'Impossible d’enregistrer le produit.');

    // Images et variantes sont réécrites intégralement : plus simple et sûr
    // qu'un diff, et les volumes concernés sont très faibles.
    await this.db.from('product_images').delete().eq('product_id', id);
    if (draft.images?.length) {
      await this.db.from('product_images').insert(
        draft.images.map((image_url, position) => ({ product_id: id, image_url, position })),
      );
    }

    await this.db.from('product_variants').delete().eq('product_id', id);
    if (draft.variants?.length) {
      await this.db.from('product_variants').insert(
        draft.variants.map((variant, index) => ({
          ...variant,
          id: variant.id || `${id}-variant-${index}`,
          product_id: id,
        })),
      );
    }

    const saved = await this.getProductById(id);
    if (!saved) throw new RepositoryError('Produit introuvable après écriture.', 'unknown');
    return saved;
  }

  async adminDeleteProduct(id: string): Promise<void> {
    const { error } = await this.db.from('products').delete().eq('id', id);
    if (error) fail(error, 'Suppression impossible.');
  }

  async adminSetStock(id: string, stock: number): Promise<Product> {
    const { error } = await this.db
      .from('products')
      .update({ stock: Math.max(0, Math.round(stock)) })
      .eq('id', id);

    if (error) fail(error, 'Impossible de mettre à jour le stock.');

    const product = await this.getProductById(id);
    if (!product) throw new RepositoryError('Produit introuvable.', 'not_found');
    return product;
  }

  async adminSaveCategory(draft: CategoryDraft): Promise<Category> {
    const slug =
      draft.slug ||
      draft.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const { data, error } = await this.db
      .from('categories')
      .upsert({ ...draft, slug, id: draft.id ?? slug })
      .select()
      .single();

    if (error) fail(error, 'Impossible d’enregistrer la catégorie.');
    return data as Category;
  }

  async adminDeleteCategory(id: string): Promise<void> {
    const { count } = await this.db
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if (count && count > 0) {
      throw new RepositoryError(
        'Cette catégorie contient encore des produits. Déplacez-les avant de la supprimer.',
        'forbidden',
      );
    }

    const { error } = await this.db.from('categories').delete().eq('id', id);
    if (error) fail(error, 'Suppression impossible.');
  }

  async adminReorderCategories(orderedIds: string[]): Promise<Category[]> {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await this.db
        .from('categories')
        .update({ position: index + 1 })
        .eq('id', orderedIds[index]);
    }

    return this.getCategories();
  }

  async adminListPromos(): Promise<PromoCode[]> {
    const { data, error } = await this.db.from('promo_codes').select('*').order('code');

    if (error) fail(error, 'Impossible de charger les codes promo.');

    return (data ?? []).map((row) => ({
      ...(row as PromoCode),
      value: Number(row.value),
      min_order: Number(row.min_order),
    }));
  }

  async adminSavePromo(draft: PromoDraft): Promise<PromoCode> {
    const payload: Record<string, unknown> = { ...draft, code: normalizeCode(draft.code) };
    // Un nouveau code démarre toujours son compteur d'utilisation à zéro.
    if (!draft.id) payload.usage_count = 0;

    const { data, error } = await this.db
      .from('promo_codes')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        throw new RepositoryError('Ce code existe déjà.', 'forbidden');
      }
      fail(error, 'Impossible d’enregistrer le code promo.');
    }

    return data as PromoCode;
  }

  async adminDeletePromo(id: string): Promise<void> {
    const { error } = await this.db.from('promo_codes').delete().eq('id', id);
    if (error) fail(error, 'Suppression impossible.');
  }

  async adminListCustomers(search = ''): Promise<CustomerSummary[]> {
    let query = this.db.from('profiles').select('*').eq('role', 'customer');

    const customerTerm = ilikePattern(search);
    if (customerTerm) {
      query = query.or(
        `first_name.ilike.${customerTerm},last_name.ilike.${customerTerm},email.ilike.${customerTerm},phone.ilike.${customerTerm}`,
      );
    }

    const { data: profiles, error } = await query.limit(200);
    if (error) fail(error, 'Impossible de charger les clients.');

    const ids = (profiles ?? []).map((profile) => profile.id as string);
    if (!ids.length) return [];

    const { data: orders } = await this.db
      .from('orders')
      .select('user_id, total, created_at, status')
      .in('user_id', ids)
      .neq('status', 'cancelled');

    return (profiles ?? [])
      .map((profile) => {
        const own = (orders ?? []).filter((order) => order.user_id === profile.id);

        return {
          user: profile as User,
          orders_count: own.length,
          total_spent: Math.round(own.reduce((sum, o) => sum + Number(o.total), 0) * 100) / 100,
          last_order_at: own.length
            ? own
                .map((o) => o.created_at as string)
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
            : null,
        };
      })
      .sort((a, b) => b.total_spent - a.total_spent);
  }

  async adminGetStats(): Promise<AdminStats> {
    const [orders, products, categories, profiles] = await Promise.all([
      this.db.from('orders').select('*, order_items(*)').limit(1000),
      this.db.from('products').select(PRODUCT_SELECT),
      this.getCategories(),
      this.db.from('profiles').select('*'),
    ]);

    if (orders.error) fail(orders.error, 'Impossible de charger les statistiques.');

    return computeStats(
      (orders.data ?? []).map(rowToOrder),
      (products.data ?? []).map(rowToProduct),
      categories,
      (profiles.data ?? []) as User[],
    );
  }

  async adminSetUserRole(userId: string, role: UserRole): Promise<User> {
    const { data, error } = await this.db
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) fail(error, 'Impossible de modifier le rôle.');
    return data as User;
  }

  /**
   * Importe le catalogue de démonstration dans Supabase. Déclenché depuis
   * l'espace administrateur : évite d'avoir à exécuter un script de seed.
   */
  async importDemoCatalog(): Promise<{ categories: number; products: number; promos: number }> {
    const { error: categoriesError } = await this.db.from('categories').upsert(demoCategories);
    if (categoriesError) fail(categoriesError, 'Import des catégories impossible.');

    const { error: productsError } = await this.db
      .from('products')
      .upsert(demoProducts.map((product) => productToRow(product)));
    if (productsError) fail(productsError, 'Import des produits impossible.');

    const variants = demoProducts.flatMap((product) =>
      product.variants.map((variant) => ({ ...variant, product_id: product.id })),
    );
    if (variants.length) await this.db.from('product_variants').upsert(variants);

    const images = demoProducts.flatMap((product) =>
      product.images.map((image_url, position) => ({
        product_id: product.id,
        image_url,
        position,
      })),
    );
    if (images.length) {
      await this.db.from('product_images').delete().in(
        'product_id',
        demoProducts.map((product) => product.id),
      );
      const { error: imagesError } = await this.db.from('product_images').insert(images);
      if (imagesError) fail(imagesError, 'Import des photos impossible.');
    }

    const { error: promosError } = await this.db.from('promo_codes').upsert(
      demoPromoCodes.map(({ id: _id, ...promo }) => promo),
      { onConflict: 'code' },
    );
    if (promosError) fail(promosError, 'Import des codes promo impossible.');

    return {
      categories: demoCategories.length,
      products: demoProducts.length,
      promos: demoPromoCodes.length,
    };
  }
}
