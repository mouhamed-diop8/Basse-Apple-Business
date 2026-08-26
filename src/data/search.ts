import { effectivePrice } from '@/utils/format';
import { Product, ProductFilters, SortOption } from './types';

/** Minuscules, sans accents, sans ponctuation : « iPhone 15 Pro » → « iphone 15 pro ». */
export const normalize = (input: string): string =>
  input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Synonymes et abréviations courantes : l'utilisateur tape « mac », « pc »,
 * « 1to »… et doit malgré tout trouver les bons produits.
 */
const SYNONYMS: Record<string, string[]> = {
  mac: ['macbook', 'apple', 'imac'],
  pc: ['portable', 'laptop', 'ordinateur'],
  ordi: ['ordinateur', 'portable'],
  tel: ['telephone', 'smartphone', 'iphone'],
  portable: ['laptop', 'ordinateur'],
  ecouteurs: ['airpods', 'casque'],
  casque: ['airpods', 'ecouteurs'],
  ssd: ['stockage', 'disque'],
  disque: ['ssd', 'stockage'],
  cle: ['usb', 'stockage'],
  ecran: ['moniteur'],
  moniteur: ['ecran'],
  souris: ['mouse'],
  clavier: ['keyboard'],
  imprimante: ['printer', 'laser'],
  chargeur: ['adaptateur', 'alimentation'],
  cable: ['cordon'],
  to: ['tb'],
  go: ['gb'],
};

const expandToken = (token: string): string[] => [token, ...(SYNONYMS[token] ?? [])];

/**
 * Distance de Levenshtein bornée : sert à tolérer les fautes de frappe
 * (« ihpone » → « iphone ») sans coût quadratique sur les longues chaînes.
 */
const withinEditDistance = (a: string, b: string, max: number): boolean => {
  if (Math.abs(a.length - b.length) > max) return false;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      current.push(value);
      rowMin = Math.min(rowMin, value);
    }

    if (rowMin > max) return false;
    previous = current;
  }

  return previous[b.length] <= max;
};

/** Le texte indexé d'un produit : nom, marque, description et caractéristiques. */
const haystack = (product: Product): string =>
  normalize(
    [
      product.name,
      product.brand,
      product.description,
      product.sku,
      product.colors.join(' '),
      product.specs.map((s) => `${s.label} ${s.value}`).join(' '),
      product.storage_gb ? `${product.storage_gb} go ${product.storage_gb / 1024} to` : '',
      product.ram_gb ? `${product.ram_gb} go ram` : '',
      product.screen_inches ? `${product.screen_inches} pouces` : '',
    ].join(' '),
  );

const cache = new Map<string, { name: string; text: string; words: string[] }>();

const indexOf = (product: Product) => {
  const cached = cache.get(product.id);
  if (cached) return cached;
  const text = haystack(product);
  const entry = { name: normalize(product.name), text, words: text.split(' ') };
  cache.set(product.id, entry);
  return entry;
};

/** Invalide l'index après une modification produit côté administrateur. */
export const invalidateSearchIndex = (productId?: string) => {
  if (productId) cache.delete(productId);
  else cache.clear();
};

/**
 * Score de pertinence. 0 = aucune correspondance, le produit est écarté.
 * Un préfixe de nom compte davantage qu'une occurrence en description.
 */
export const searchScore = (product: Product, query: string): number => {
  const q = normalize(query);
  if (!q) return 1;

  const { name, text, words } = indexOf(product);
  const tokens = q.split(' ').filter(Boolean);
  let score = 0;

  if (name === q) score += 200;
  else if (name.startsWith(q)) score += 120;
  else if (name.includes(q)) score += 80;
  else if (text.includes(q)) score += 30;

  for (const token of tokens) {
    const variants = expandToken(token);
    let tokenScore = 0;

    for (const variant of variants) {
      const isSynonym = variant !== token;

      if (name.startsWith(variant)) tokenScore = Math.max(tokenScore, isSynonym ? 20 : 40);
      else if (name.includes(variant)) tokenScore = Math.max(tokenScore, isSynonym ? 14 : 28);
      else if (words.some((w) => w.startsWith(variant)))
        tokenScore = Math.max(tokenScore, isSynonym ? 8 : 16);
      else if (text.includes(variant)) tokenScore = Math.max(tokenScore, isSynonym ? 5 : 10);
      else if (
        variant.length >= 4 &&
        words.some((w) => Math.abs(w.length - variant.length) <= 2 && withinEditDistance(w, variant, 1))
      )
        tokenScore = Math.max(tokenScore, 6);
    }

    // Un seul mot non trouvé ne doit pas annuler une requête de plusieurs mots.
    score += tokenScore;
  }

  const matched = tokens.filter((token) =>
    expandToken(token).some((variant) => text.includes(variant)),
  ).length;

  if (matched === 0) return 0;

  // Bonus si tous les mots de la requête sont présents.
  if (matched === tokens.length) score += 25;

  return score;
};

const matchesFilters = (product: Product, filters: ProductFilters): boolean => {
  const price = effectivePrice(product.price, product.sale_price);

  if (filters.categoryIds.length && !filters.categoryIds.includes(product.category_id)) return false;
  if (filters.brands.length && !filters.brands.includes(product.brand)) return false;
  if (filters.minPrice !== null && price < filters.minPrice) return false;
  if (filters.maxPrice !== null && price > filters.maxPrice) return false;
  if (filters.inStockOnly && product.stock <= 0) return false;
  if (filters.onSaleOnly && !(product.sale_price && product.sale_price < product.price)) return false;
  if (filters.minRating !== null && product.rating < filters.minRating) return false;
  if (filters.storageOptions.length && !filters.storageOptions.includes(product.storage_gb ?? -1))
    return false;
  if (filters.ramOptions.length && !filters.ramOptions.includes(product.ram_gb ?? -1)) return false;
  if (
    filters.screenOptions.length &&
    !filters.screenOptions.some((size) => Math.abs((product.screen_inches ?? -1) - size) < 0.55)
  )
    return false;
  if (filters.colors.length && !product.colors.some((c) => filters.colors.includes(c))) return false;

  return true;
};

const comparators: Record<SortOption, (a: Product, b: Product) => number> = {
  relevance: () => 0,
  price_asc: (a, b) =>
    effectivePrice(a.price, a.sale_price) - effectivePrice(b.price, b.sale_price),
  price_desc: (a, b) =>
    effectivePrice(b.price, b.sale_price) - effectivePrice(a.price, a.sale_price),
  popular: (a, b) => b.units_sold - a.units_sold,
  rating: (a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count,
  newest: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  promo: (a, b) => {
    const discount = (p: Product) =>
      p.sale_price && p.sale_price < p.price ? (p.price - p.sale_price) / p.price : 0;
    return discount(b) - discount(a);
  },
};

/** Applique recherche, filtres puis tri. Renvoie une nouvelle liste. */
export const queryProducts = (products: Product[], filters: ProductFilters): Product[] => {
  const scored = products
    .filter((product) => product.is_active && matchesFilters(product, filters))
    .map((product) => ({ product, score: searchScore(product, filters.query) }))
    .filter((entry) => entry.score > 0);

  if (filters.sort === 'relevance') {
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        b.product.units_sold - a.product.units_sold ||
        a.product.name.localeCompare(b.product.name, 'fr'),
    );
  } else {
    const compare = comparators[filters.sort];
    scored.sort((a, b) => compare(a.product, b.product) || b.score - a.score);
  }

  return scored.map((entry) => entry.product);
};

/** Suggestions affichées sous la barre de recherche pendant la saisie. */
export const buildSuggestions = (products: Product[], query: string, limit = 6): string[] => {
  const q = normalize(query);
  if (q.length < 2) return [];

  const names = products
    .map((product) => ({ name: product.name, score: searchScore(product, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.name);

  return Array.from(new Set(names));
};
