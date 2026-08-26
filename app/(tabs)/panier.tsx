import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductVisual } from '@/components/product/ProductVisual';
import {
  AppText,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Divider,
  EmptyState,
  Input,
  QuantityStepper,
  ScreenHeader,
} from '@/components/ui';
import { db } from '@/data';
import { FREE_SHIPPING_THRESHOLD } from '@/data/constants';
import { RepositoryError } from '@/data/repository';
import { CartLine } from '@/data/types';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useCartStore, useCartTotals } from '@/store/cart';
import { toast } from '@/store/toast';
import { colors, layout, radius, shadow, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';

const CartLineRow = ({
  line,
  onRemove,
}: {
  line: CartLine;
  onRemove: () => void;
}) => {
  const router = useRouter();
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);

  return (
    <View style={styles.line}>
      <Pressable
        onPress={() => router.push(`/produit/${line.product_id}`)}
        accessibilityRole="button"
        accessibilityLabel={line.name}
        style={styles.lineImage}
      >
        <ProductVisual
          uri={line.image || undefined}
          productId={line.product_id}
          categoryId=""
          size={72}
        />
      </Pressable>

      <View style={styles.lineBody}>
        <AppText variant="micro" color={colors.muted}>
          {line.brand}
        </AppText>

        <AppText variant="captionStrong" numberOfLines={2}>
          {line.name}
        </AppText>

        {line.variant_label ? (
          <AppText variant="micro" color={colors.muted}>
            {line.variant_label}
          </AppText>
        ) : null}

        <View style={styles.lineFooter}>
          <AppText variant="bodyStrong">{formatPrice(line.unit_price * line.quantity)}</AppText>

          <QuantityStepper
            value={line.quantity}
            max={line.max_stock}
            compact
            onIncrement={() => {
              if (line.quantity >= line.max_stock) {
                toast.info(`Stock maximum atteint (${line.max_stock}).`);
                return;
              }
              increment(line.key);
            }}
            onDecrement={() => decrement(line.key)}
          />
        </View>

        {line.quantity >= line.max_stock ? (
          <AppText variant="micro" color={colors.warning}>
            Quantité maximale disponible
          </AppText>
        ) : null}
      </View>

      <Pressable
        onPress={onRemove}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Retirer ${line.name} du panier`}
        style={({ pressed }) => [styles.removeButton, pressed ? { opacity: 0.7 } : null]}
      >
        <Ionicons name="trash-outline" size={17} color={colors.muted} />
      </Pressable>
    </View>
  );
};

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { screenPadding, isCompact } = useBreakpoint();

  const lines = useCartStore((state) => state.lines);
  const promo = useCartStore((state) => state.promo);
  const setPromo = useCartStore((state) => state.setPromo);
  const removeLine = useCartStore((state) => state.removeLine);
  const clear = useCartStore((state) => state.clear);
  const totals = useCartTotals();

  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<CartLine | null>(null);
  const [clearing, setClearing] = useState(false);

  const applyCode = async () => {
    if (!code.trim()) return;

    setChecking(true);

    try {
      const applied = await db.validatePromoCode(code, totals.subtotal);
      setPromo(applied);
      setCode('');
      toast.success(`Code ${applied.code} appliqué : -${formatPrice(applied.amount)}`);
    } catch (error) {
      toast.error(
        error instanceof RepositoryError ? error.message : 'Ce code promo est invalide.',
      );
    } finally {
      setChecking(false);
    }
  };

  if (lines.length === 0) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Panier" withStatusBar onBack={() => router.push('/')} />

        <EmptyState
          icon="bag-outline"
          title="Votre panier est vide"
          message="Parcourez le catalogue et ajoutez vos premiers produits : iPhone, ordinateurs, accessoires et matériel bureautique."
          actionLabel="Découvrir nos produits"
          onAction={() => router.push('/catalogue')}
          secondaryActionLabel="Voir les promotions"
          onSecondaryAction={() => router.push('/catalogue?promo=1')}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Panier"
        subtitle={`${totals.count} article${totals.count > 1 ? 's' : ''}`}
        withStatusBar
        onBack={() => router.push('/')}
        right={
          <Pressable
            onPress={() => setClearing(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Vider le panier"
            style={styles.headerAction}
          >
            <AppText variant="micro" color={colors.danger}>
              Vider
            </AppText>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { padding: screenPadding, paddingBottom: 172 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {totals.freeShippingGap > 0 ? (
          <Card style={styles.shippingHint}>
            <Ionicons name="rocket-outline" size={18} color={colors.primary} />
            <AppText variant="caption" style={styles.shippingHintText}>
              Ajoutez {formatPrice(totals.freeShippingGap)} pour bénéficier de la livraison
              standard offerte (dès {formatPrice(FREE_SHIPPING_THRESHOLD)}).
            </AppText>
          </Card>
        ) : (
          <Card style={styles.shippingHint}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <AppText variant="caption" style={styles.shippingHintText}>
              Livraison standard offerte sur cette commande.
            </AppText>
          </Card>
        )}

        <Card padded={false}>
          {lines.map((line, index) => (
            <View key={line.key}>
              {index > 0 ? <Divider /> : null}
              <CartLineRow line={line} onRemove={() => setPendingRemoval(line)} />
            </View>
          ))}
        </Card>

        <Card style={styles.promoCard}>
          <AppText variant="bodyStrong">Code promo</AppText>

          {promo ? (
            <View style={styles.promoApplied}>
              <Badge
                label={`${promo.code} · -${promo.type === 'percentage' ? `${promo.value} %` : formatPrice(promo.value)}`}
                tone="success"
                icon="pricetag"
              />

              <Pressable
                onPress={() => {
                  setPromo(null);
                  toast.info('Code promo retiré.');
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Retirer le code promo"
              >
                <AppText variant="micro" color={colors.danger}>
                  Retirer
                </AppText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.promoRow}>
              <Input
                placeholder="Ex. BIENVENUE10"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                autoCorrect={false}
                containerStyle={styles.promoInput}
                icon="pricetag-outline"
              />
              <Button label="Appliquer" onPress={applyCode} loading={checking} size="md" />
            </View>
          )}
        </Card>

        <Card style={styles.summary}>
          <View style={styles.summaryRow}>
            <AppText variant="caption">Sous-total</AppText>
            <AppText variant="captionStrong">{formatPrice(totals.subtotal)}</AppText>
          </View>

          <View style={styles.summaryRow}>
            <AppText variant="caption">Frais de livraison</AppText>
            <AppText variant="captionStrong">
              {totals.shippingCost === 0 ? 'Offerts' : formatPrice(totals.shippingCost)}
            </AppText>
          </View>

          {totals.discount > 0 ? (
            <View style={styles.summaryRow}>
              <AppText variant="caption" color={colors.success}>
                Réduction {promo ? `(${promo.code})` : ''}
              </AppText>
              <AppText variant="captionStrong" color={colors.success}>
                -{formatPrice(totals.discount)}
              </AppText>
            </View>
          ) : null}

          <Divider style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <AppText variant="subheading">Total</AppText>
            <AppText variant="subheading">{formatPrice(totals.total)}</AppText>
          </View>

          <AppText variant="micro" color={colors.muted}>
            Le mode de livraison définitif est choisi à l’étape suivante.
          </AppText>
        </Card>
      </ScrollView>

      <View
        style={[
          styles.bar,
          shadow.lg,
          {
            paddingBottom: insets.bottom + spacing.md,
            paddingHorizontal: screenPadding,
            flexDirection: isCompact ? 'column' : 'row',
            alignItems: isCompact ? 'stretch' : 'center',
          },
        ]}
      >
        <View>
          <AppText variant="micro" color={colors.muted}>
            Total à payer
          </AppText>
          <AppText variant="heading">{formatPrice(totals.total)}</AppText>
        </View>

        <Button
          label="Passer la commande"
          icon="arrow-forward"
          haptic
          onPress={() => router.push('/commande/informations')}
          style={styles.barButton}
        />
      </View>

      <ConfirmDialog
        visible={pendingRemoval !== null}
        title="Retirer cet article ?"
        message={pendingRemoval?.name}
        confirmLabel="Retirer"
        destructive
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) {
            removeLine(pendingRemoval.key);
            toast.info('Article retiré du panier.');
          }
          setPendingRemoval(null);
        }}
      />

      <ConfirmDialog
        visible={clearing}
        title="Vider le panier ?"
        message="Tous les articles seront retirés. Cette action est irréversible."
        confirmLabel="Vider"
        destructive
        onCancel={() => setClearing(false)}
        onConfirm={() => {
          clear();
          setClearing(false);
          toast.info('Panier vidé.');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: {
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  headerAction: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  shippingHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  shippingHintText: { flex: 1 },
  line: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, alignItems: 'flex-start' },
  lineImage: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  lineBody: { flex: 1, gap: 3 },
  lineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  removeButton: { padding: spacing.xs },
  promoCard: { gap: spacing.md },
  promoRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  promoInput: { flex: 1 },
  promoApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summary: { gap: spacing.sm },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryDivider: { marginVertical: spacing.xs },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingHorizontal: 0,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  barButton: { flex: 1 },
});
