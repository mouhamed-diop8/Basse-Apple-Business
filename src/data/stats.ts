import { AdminStats, Category, Order, Product, SalesPoint, User } from './types';

const DAY = 86_400_000;

const MONTHS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const round = (value: number) => Math.round(value * 100) / 100;

/** Le chiffre d'affaires exclut les commandes annulées. */
const isRevenue = (order: Order) => order.status !== 'cancelled';

/**
 * Agrégation des indicateurs du dashboard administrateur (section 16).
 * Fonction pure : les deux backends l'utilisent avec leurs propres données.
 */
export const computeStats = (
  orders: Order[],
  products: Product[],
  categories: Category[],
  customers: User[],
): AdminStats => {
  const now = new Date();
  const valid = orders.filter(isRevenue);

  const revenue = round(valid.reduce((sum, o) => sum + o.total, 0));

  const revenueToday = round(
    valid
      .filter((o) => isSameDay(new Date(o.created_at), now))
      .reduce((sum, o) => sum + o.total, 0),
  );

  const revenueMonth = round(
    valid
      .filter((o) => {
        const date = new Date(o.created_at);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      })
      .reduce((sum, o) => sum + o.total, 0),
  );

  const ordersToday = orders.filter((o) => isSameDay(new Date(o.created_at), now)).length;

  const pendingOrders = orders.filter((o) =>
    ['received', 'payment_confirmed', 'preparing'].includes(o.status),
  ).length;

  const unitsSold = valid.reduce(
    (sum, o) => sum + o.items.reduce((s, item) => s + item.quantity, 0),
    0,
  );

  /* --- Séries temporelles : 14 derniers jours --- */
  const revenueByDay: SalesPoint[] = [];
  const ordersByDay: SalesPoint[] = [];

  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * DAY);
    const dayOrders = orders.filter((o) => isSameDay(new Date(o.created_at), day));
    const label = `${day.getDate()}/${day.getMonth() + 1}`;

    revenueByDay.push({
      label,
      value: round(dayOrders.filter(isRevenue).reduce((sum, o) => sum + o.total, 0)),
    });
    ordersByDay.push({ label, value: dayOrders.length });
  }

  /* --- Séries temporelles : 6 derniers mois --- */
  const revenueByMonth: SalesPoint[] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthOrders = valid.filter((o) => {
      const date = new Date(o.created_at);
      return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
    });

    revenueByMonth.push({
      label: MONTHS[ref.getMonth()],
      value: round(monthOrders.reduce((sum, o) => sum + o.total, 0)),
    });
  }

  /* --- Ventes par catégorie --- */
  const productIndex = new Map(products.map((p) => [p.id, p]));
  const categoryTotals = new Map<string, number>();

  valid.forEach((order) => {
    order.items.forEach((item) => {
      const product = productIndex.get(item.product_id);
      if (!product) return;
      const amount = item.unit_price * item.quantity;
      categoryTotals.set(product.category_id, (categoryTotals.get(product.category_id) ?? 0) + amount);
    });
  });

  const salesByCategory: SalesPoint[] = categories
    .map((category) => ({
      label: category.name,
      value: round(categoryTotals.get(category.id) ?? 0),
    }))
    .filter((point) => point.value > 0)
    .sort((a, b) => b.value - a.value);

  /* --- Meilleures ventes, calculées sur les commandes réelles --- */
  const productTotals = new Map<string, { units: number; revenue: number }>();

  valid.forEach((order) => {
    order.items.forEach((item) => {
      const current = productTotals.get(item.product_id) ?? { units: 0, revenue: 0 };
      current.units += item.quantity;
      current.revenue += item.unit_price * item.quantity;
      productTotals.set(item.product_id, current);
    });
  });

  const topProducts = Array.from(productTotals.entries())
    .map(([productId, totals]) => ({
      product: productIndex.get(productId),
      units: totals.units,
      revenue: round(totals.revenue),
    }))
    .filter((entry): entry is { product: Product; units: number; revenue: number } =>
      Boolean(entry.product),
    )
    .sort((a, b) => b.units - a.units)
    .slice(0, 8);

  const outOfStock = products.filter((p) => p.stock <= 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.low_stock_threshold);

  return {
    revenue,
    revenueToday,
    revenueMonth,
    ordersCount: orders.length,
    ordersToday,
    pendingOrders,
    customersCount: customers.filter((u) => u.role === 'customer').length,
    unitsSold,
    outOfStockCount: outOfStock.length,
    lowStockCount: lowStock.length,
    averageOrderValue: valid.length ? round(revenue / valid.length) : 0,
    revenueByDay,
    revenueByMonth,
    ordersByDay,
    salesByCategory,
    topProducts,
    lowStockProducts: [...lowStock, ...outOfStock].sort((a, b) => a.stock - b.stock).slice(0, 10),
  };
};
