import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PriceTag } from '@/components/product/PriceTag';
import { ProductCarousel } from '@/components/product/ProductCarousel';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ReviewsSection } from '@/components/product/ReviewsSection';
import {
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  ColorDot,
  Divider,
  EmptyState,
  QuantityStepper,
  Rating,
  ScreenHeader,
  Skeleton,
  TextBlockSkeleton,
} from '@/components/ui';
import { db } from '@/data';
import { Product, ProductVariant, Review } from '@/data/types';
import { useAddToCart } from '@/hooks/useAddToCart';
import { useAsync } from '@/hooks/useAsync';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useGrid } from '@/hooks/useGrid';
import { colors, layout, radius, shadow, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';
import { conditionLabel, groupVariants, stockInfo } from '@/utils/product';
import { resolveMaxStock, resolveUnitPrice } from '@/store/cart';

const loadProduct = async (id: string) => {
  const product = await db.getProductById(id);
  if (!product) return { product: null, reviews: [] as Review[], related: [] as Product[] };

  const [reviews, related] = await Promise.all([
    db.getReviews(id),
    db.getRelatedProducts(id, 8),
  ]);

  return { product, reviews, related };
};

/** Accordéon des informations complémentaires (section 6). */
const InfoBlock = ({
  icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.infoHeader, pressed ? { opacity: 0.8 } : null]}
      >
        <Ionicons name={icon} size={18} color={colors.inkSoft} />
        <AppText variant="bodyStrong" style={styles.infoTitle}>
          {title}
        </AppText>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.mutedLight}
        />
      </Pressable>

      {open ? <View style={styles.infoBody}>{children}</View> : null}
    </View>
  );
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDesktop, screenPadding, contentWidth } = useBreakpoint();
  const { cardWidth } = useGrid();
  const addToCart = useAddToCart();

  const { data, loading, error, reload, setData } = useAsync(() => loadProduct(id), [id]);

  const product = data?.product ?? null;
  const [selection, setSelection] = useState<ProductVariant[]>([]);
  const [quantity, setQuantity] = useState(1);

  const groups = useMemo(() => (product ? groupVariants(product) : []), [product]);

  // Sélection par défaut dès que le produit est chargé.
  useEffect(() => {
    if (!product) return;

    setSelection(
      groupVariants(product).map(
        (group) => group.options.find((option) => option.stock > 0) ?? group.options[0],
      ),
    );
    setQuantity(1);
  }, [product]);

  const unitPrice = product ? resolveUnitPrice(product, selection) : 0;
  const maxStock = product ? resolveMaxStock(product, selection) : 0;
  const stock = product ? stockInfo(product) : null;
  const available = maxStock > 0;

  // Le prix barré suit le supplément de variante pour rester cohérent.
  const variantDelta = selection.reduce((sum, variant) => sum + variant.price_delta, 0);
  const referencePrice = product ? product.price + variantDelta : 0;

  const pick = (variant: ProductVariant) =>
    setSelection((current) => {
      const next = current.filter((item) => item.kind !== variant.kind);
      return [...next, variant].sort(
        (a, b) => groups.findIndex((g) => g.kind === a.kind) - groups.findIndex((g) => g.kind === b.kind),
      );
    });

  const galleryWidth = isDesktop
    ? Math.min(Math.floor((contentWidth - screenPadding * 2) * 0.48), 520)
    : contentWidth;

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Produit" withStatusBar />
        <View style={styles.loading}>
          <Skeleton height={280} rounded={radius.lg} />
          <Skeleton width="40%" height={12} />
          <Skeleton width="80%" height={20} />
          <Skeleton width="50%" height={24} />
          <TextBlockSkeleton lines={4} />
        </View>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Produit" withStatusBar />
        <EmptyState
          icon={error ? 'cloud-offline-outline' : 'help-circle-outline'}
          tone={error ? 'danger' : 'neutral'}
          title={error ? 'Chargement impossible' : 'Produit introuvable'}
          message={
            error ??
            'Ce produit n’existe plus ou n’est plus disponible dans notre catalogue.'
          }
          actionLabel={error ? 'Réessayer' : 'Voir le catalogue'}
          onAction={error ? reload : () => router.replace('/catalogue')}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={product.brand}
        subtitle={product.name}
        withStatusBar
        right={
          <Pressable
            onPress={() => router.push('/panier')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Voir le panier"
            style={styles.headerAction}
          >
            <Ionicons name="bag-outline" size={20} color={colors.ink} />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 132 + insets.bottom }]}
      >
        <View style={isDesktop ? styles.desktopSplit : undefined}>
          <ProductGallery product={product} width={galleryWidth} />

          <View style={[styles.body, isDesktop ? styles.desktopBuy : null, { padding: screenPadding }]}>
            <View style={styles.headline}>
              <View style={styles.headlineTop}>
                <AppText variant="caption" color={colors.muted}>
                  {product.brand} · Réf. {product.sku}
                </AppText>
                <Badge
                  label={conditionLabel(product)}
                  tone={product.condition === 'refurbished' ? 'primary' : 'neutral'}
                />
              </View>

              <AppText variant="title">{product.name}</AppText>

              <Rating value={product.rating} count={product.reviews_count} size={14} />

              <PriceTag price={referencePrice} salePrice={unitPrice < referencePrice ? unitPrice : null} size="lg" />

              {stock ? (
                <View style={styles.stockRow}>
                  <Ionicons
                    name={available ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={available ? colors.success : colors.danger}
                  />
                  <AppText
                    variant="captionStrong"
                    color={available ? colors.success : colors.danger}
                  >
                    {available
                      ? maxStock <= product.low_stock_threshold
                        ? `Plus que ${maxStock} en stock pour cette configuration`
                        : 'En stock, expédié sous 24 h'
                      : 'Rupture de stock'}
                  </AppText>
                </View>
              ) : null}
            </View>

            {groups.length > 0 ? (
              <View style={styles.variants}>
                {groups.map((group) => {
                  const current = selection.find((item) => item.kind === group.kind);

                  return (
                    <View key={group.kind} style={styles.variantGroup}>
                      <View style={styles.variantHeader}>
                        <AppText variant="captionStrong">{group.name}</AppText>
                        {current ? (
                          <AppText variant="micro" color={colors.muted}>
                            {current.value}
                          </AppText>
                        ) : null}
                      </View>

                      {group.kind === 'color' ? (
                        <View style={styles.colorRow}>
                          {group.options.map((option) => (
                            <ColorDot
                              key={option.id}
                              hex={option.hex ?? colors.surfaceSunken}
                              label={option.value}
                              selected={current?.id === option.id}
                              onPress={() => pick(option)}
                            />
                          ))}
                        </View>
                      ) : (
                        <View style={styles.chipRow}>
                          {group.options.map((option) => (
                            <Chip
                              key={option.id}
                              label={
                                option.price_delta > 0
                                  ? `${option.value}  +${formatPrice(option.price_delta)}`
                                  : option.value
                              }
                              selected={current?.id === option.id}
                              onPress={() => pick(option)}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.quantityRow}>
              <AppText variant="captionStrong">Quantité</AppText>
              <QuantityStepper
                value={quantity}
                max={Math.max(1, maxStock)}
                onIncrement={() => setQuantity((value) => Math.min(maxStock, value + 1))}
                onDecrement={() => setQuantity((value) => Math.max(1, value - 1))}
              />
            </View>
          </View>
        </View>

        <View style={[styles.body, { padding: screenPadding }]}>
          <Card padded={false} style={styles.infoCard}>
            <InfoBlock icon="document-text-outline" title="Description" defaultOpen>
              <AppText variant="body">{product.description}</AppText>
            </InfoBlock>

            <Divider />

            <InfoBlock icon="list-outline" title="Caractéristiques techniques">
              <View style={styles.specs}>
                {product.specs.map((spec) => (
                  <View key={spec.label} style={styles.specRow}>
                    <AppText variant="caption" style={styles.specLabel}>
                      {spec.label}
                    </AppText>
                    <AppText variant="captionStrong" style={styles.specValue}>
                      {spec.value}
                    </AppText>
                  </View>
                ))}
              </View>
            </InfoBlock>

            {product.included_accessories.length > 0 ? (
              <>
                <Divider />
                <InfoBlock icon="cube-outline" title="Contenu de la boîte">
                  <View style={styles.bullets}>
                    {product.included_accessories.map((accessory) => (
                      <View key={accessory} style={styles.bullet}>
                        <Ionicons name="checkmark" size={14} color={colors.success} />
                        <AppText variant="caption">{accessory}</AppText>
                      </View>
                    ))}
                  </View>
                </InfoBlock>
              </>
            ) : null}

            <Divider />

            <InfoBlock icon="shield-checkmark-outline" title="Garantie et retour">
              <View style={styles.bullets}>
                <AppText variant="caption">{product.warranty}</AppText>
                <AppText variant="caption">{product.return_policy}</AppText>
              </View>
            </InfoBlock>

            <Divider />

            <InfoBlock icon="rocket-outline" title="Livraison et disponibilité">
              <View style={styles.bullets}>
                <AppText variant="caption">{product.shipping_note}</AppText>
                <AppText variant="caption">
                  {available
                    ? `${maxStock} unité${maxStock > 1 ? 's' : ''} disponible${maxStock > 1 ? 's' : ''} pour la configuration choisie.`
                    : 'Produit momentanément indisponible. Ajoutez-le à vos favoris pour être prévenu.'}
                </AppText>
              </View>
            </InfoBlock>
          </Card>

          <ReviewsSection
            productId={product.id}
            reviews={data?.reviews ?? []}
            rating={product.rating}
            reviewsCount={product.reviews_count}
            onReviewAdded={(review) =>
              setData({
                product: data?.product ?? null,
                reviews: [review, ...(data?.reviews ?? [])],
                related: data?.related ?? [],
              })
            }
          />

          <ProductCarousel
            title="Vous aimerez aussi"
            products={data?.related ?? []}
            cardWidth={cardWidth}
          />
        </View>
      </ScrollView>

      <View style={[styles.actionBar, shadow.lg, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={[styles.actionInner, { paddingHorizontal: screenPadding }]}>
        <View style={styles.actionPrice}>
          <AppText variant="micro" color={colors.muted}>
            Total
          </AppText>
          <AppText variant="subheading">{formatPrice(unitPrice * quantity)}</AppText>
        </View>

        <View style={styles.actionButtons}>
          <Button
            label="Ajouter"
            variant="outline"
            icon="bag-add-outline"
            disabled={!available}
            onPress={() => addToCart(product, selection, quantity)}
            style={styles.actionButton}
          />

          <Button
            label="Acheter"
            icon="flash-outline"
            haptic
            disabled={!available}
            onPress={() => {
              if (addToCart(product, selection, quantity)) {
                router.push('/commande/informations');
              }
            }}
            style={styles.actionButton}
          />
        </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  loading: { padding: spacing.lg, gap: spacing.md },
  scroll: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  desktopSplit: { flexDirection: 'row', alignItems: 'flex-start', gap: 0 },
  desktopBuy: { flex: 1, minWidth: 280 },
  body: { gap: spacing.xxl },
  headline: { gap: spacing.sm },
  headlineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  variants: { gap: spacing.lg },
  variantGroup: { gap: spacing.sm },
  variantHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colorRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCard: { overflow: 'hidden' },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  infoTitle: { flex: 1 },
  infoBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  specs: { gap: spacing.sm },
  specRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  specLabel: { flex: 0.9 },
  specValue: { flex: 1.1, textAlign: 'right' },
  bullets: { gap: spacing.xs },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  actionPrice: { gap: 1 },
  actionButtons: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
});
