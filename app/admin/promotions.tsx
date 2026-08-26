import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  Divider,
  EmptyState,
  ErrorState,
  Input,
  ListSkeleton,
  ScreenHeader,
  Sheet,
  SwitchRow,
} from '@/components/ui';
import { db } from '@/data';
import { RepositoryError } from '@/data/repository';
import { PromoCode, PromoType } from '@/data/types';
import { useAsync } from '@/hooks/useAsync';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';
import { formatDate, formatPrice } from '@/utils/format';

const emptyForm = {
  code: '',
  type: 'percentage' as PromoType,
  value: '',
  min_order: '',
  expiration_date: '',
  usage_limit: '100',
  is_active: true,
};

/** Saisie tolérante : « 31/12/2026 » ou « 2026-12-31 ». */
const parseDate = (value: string): string | null => {
  const trimmed = value.trim();

  const french = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (french) return new Date(`${french[3]}-${french[2]}-${french[1]}T23:59:59`).toISOString();

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(`${trimmed}T23:59:59`).toISOString();

  return null;
};

const toInputDate = (iso: string): string => {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export default function AdminPromosScreen() {
  const router = useRouter();

  const { data, loading, error, refreshing, reload } = useAsync(() => db.adminListPromos(), []);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({});
  const [pendingDelete, setPendingDelete] = useState<PromoCode | null>(null);
  const [busy, setBusy] = useState(false);

  const promos = data ?? [];

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (promo: PromoCode) => {
    setEditing(promo);
    setForm({
      code: promo.code,
      type: promo.type,
      value: String(promo.value),
      min_order: promo.min_order ? String(promo.min_order) : '',
      expiration_date: toInputDate(promo.expiration_date),
      usage_limit: String(promo.usage_limit),
      is_active: promo.is_active,
    });
    setErrors({});
    setSheetOpen(true);
  };

  const save = async () => {
    const next: Partial<Record<keyof typeof emptyForm, string>> = {};

    if (!/^[A-Z0-9]{3,20}$/.test(form.code.trim().toUpperCase())) {
      next.code = 'Le code doit contenir 3 à 20 lettres ou chiffres.';
    }

    const value = Number(form.value.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) next.value = 'Valeur invalide.';
    else if (form.type === 'percentage' && value > 90) {
      next.value = 'Une remise en pourcentage ne peut dépasser 90 %.';
    }

    const expiration = parseDate(form.expiration_date);
    if (!expiration) next.expiration_date = 'Format attendu : JJ/MM/AAAA.';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);

    try {
      await db.adminSavePromo({
        ...(editing ? { id: editing.id } : {}),
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value,
        min_order: Number(form.min_order.replace(',', '.')) || 0,
        expiration_date: expiration!,
        usage_limit: Number(form.usage_limit) || 0,
        is_active: form.is_active,
      });

      toast.success(editing ? 'Code promo mis à jour.' : 'Code promo créé.');
      setSheetOpen(false);
      reload();
    } catch (caught) {
      toast.error(
        caught instanceof RepositoryError ? caught.message : 'L’enregistrement a échoué.',
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      await db.adminDeletePromo(pendingDelete.id);
      toast.success('Code promo supprimé.');
      setPendingDelete(null);
      reload();
    } catch {
      toast.error('La suppression a échoué.');
      setPendingDelete(null);
    }
  };

  const statusOf = (promo: PromoCode) => {
    if (!promo.is_active) return { label: 'Inactif', tone: 'neutral' as const };
    if (new Date(promo.expiration_date).getTime() < Date.now())
      return { label: 'Expiré', tone: 'danger' as const };
    if (promo.usage_limit > 0 && promo.usage_count >= promo.usage_limit)
      return { label: 'Épuisé', tone: 'warning' as const };
    return { label: 'Actif', tone: 'success' as const };
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Promotions"
        subtitle={loading ? undefined : `${promos.length} code(s)`}
        withStatusBar
        onBack={() => router.replace('/admin')}
        right={
          <Pressable
            onPress={openCreate}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Créer un code promo"
            style={({ pressed }) => [styles.addButton, pressed ? styles.pressed : null]}
          >
            <Ionicons name="add" size={22} color={colors.white} />
          </Pressable>
        }
      />

      {loading ? (
        <View style={styles.content}>
          <ListSkeleton count={5} height={124} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : promos.length === 0 ? (
        <EmptyState
          icon="pricetag-outline"
          title="Aucun code promo"
          message="Créez un code pour offrir une remise en pourcentage ou un montant fixe."
          actionLabel="Créer un code"
          onAction={openCreate}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />
          }
        >
          {promos.map((promo) => {
            const status = statusOf(promo);
            const usage =
              promo.usage_limit > 0
                ? Math.min(1, promo.usage_count / promo.usage_limit)
                : 0;

            return (
              <Card key={promo.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.codeBox}>
                    <AppText variant="captionStrong" color={colors.white}>
                      {promo.code}
                    </AppText>
                  </View>

                  <Badge label={status.label} tone={status.tone} />

                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() => openEdit(promo)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Modifier ${promo.code}`}
                      style={styles.iconButton}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.inkSoft} />
                    </Pressable>

                    <Pressable
                      onPress={() => setPendingDelete(promo)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Supprimer ${promo.code}`}
                      style={styles.iconButton}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>

                <AppText variant="bodyStrong">
                  {promo.type === 'percentage'
                    ? `-${promo.value} % sur le panier`
                    : `-${formatPrice(promo.value)} sur le panier`}
                </AppText>

                <AppText variant="micro" color={colors.muted}>
                  {promo.min_order > 0
                    ? `À partir de ${formatPrice(promo.min_order)} d’achat`
                    : 'Sans minimum d’achat'}
                  {' · '}
                  Expire le {formatDate(promo.expiration_date)}
                </AppText>

                <Divider style={styles.divider} />

                <View style={styles.usageRow}>
                  <AppText variant="micro" color={colors.muted}>
                    Utilisations : {promo.usage_count}
                    {promo.usage_limit > 0 ? ` / ${promo.usage_limit}` : ' (illimité)'}
                  </AppText>

                  {promo.usage_limit > 0 ? (
                    <View style={styles.usageTrack}>
                      <View
                        style={[
                          styles.usageFill,
                          {
                            width: `${usage * 100}%`,
                            backgroundColor: usage >= 1 ? colors.danger : colors.primary,
                          },
                        ]}
                      />
                    </View>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Modifier le code' : 'Nouveau code promo'}
        footer={
          <Button
            label={editing ? 'Enregistrer' : 'Créer le code'}
            onPress={save}
            loading={busy}
            fullWidth
            size="lg"
          />
        }
      >
        <Input
          label="Code"
          placeholder="RENTREE20"
          value={form.code}
          onChangeText={(value) => {
            setForm((current) => ({ ...current, code: value.toUpperCase() }));
            setErrors((current) => ({ ...current, code: undefined }));
          }}
          error={errors.code}
          autoCapitalize="characters"
          required
        />

        <View style={styles.field}>
          <AppText variant="captionStrong">Type de remise</AppText>

          <View style={styles.chips}>
            <Chip
              label="Pourcentage"
              selected={form.type === 'percentage'}
              onPress={() => setForm((current) => ({ ...current, type: 'percentage' }))}
            />
            <Chip
              label="Montant fixe"
              selected={form.type === 'fixed'}
              onPress={() => setForm((current) => ({ ...current, type: 'fixed' }))}
            />
          </View>
        </View>

        <Input
          label={form.type === 'percentage' ? 'Remise (%)' : 'Remise (F CFA)'}
          placeholder={form.type === 'percentage' ? '20' : '50'}
          value={form.value}
          onChangeText={(value) => {
            setForm((current) => ({ ...current, value }));
            setErrors((current) => ({ ...current, value: undefined }));
          }}
          error={errors.value}
          keyboardType="decimal-pad"
          required
        />

        <Input
          label="Montant minimum de commande (F CFA)"
          placeholder="0"
          value={form.min_order}
          onChangeText={(value) => setForm((current) => ({ ...current, min_order: value }))}
          keyboardType="decimal-pad"
          hint="Laissez vide pour aucun minimum."
        />

        <Input
          label="Date d’expiration"
          placeholder="31/12/2026"
          value={form.expiration_date}
          onChangeText={(value) => {
            setForm((current) => ({ ...current, expiration_date: value }));
            setErrors((current) => ({ ...current, expiration_date: undefined }));
          }}
          error={errors.expiration_date}
          required
        />

        <Input
          label="Limite d’utilisations"
          value={form.usage_limit}
          onChangeText={(value) =>
            setForm((current) => ({ ...current, usage_limit: value.replace(/\D/g, '') }))
          }
          keyboardType="number-pad"
          hint="0 pour un usage illimité."
        />

        <Card padded={false}>
          <SwitchRow
            label="Code actif"
            description="Désactivez sans supprimer pour suspendre l’offre."
            value={form.is_active}
            onChange={(value) => setForm((current) => ({ ...current, is_active: value }))}
          />
        </Card>
      </Sheet>

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Supprimer ce code promo ?"
        message={
          pendingDelete
            ? `« ${pendingDelete.code} » ne pourra plus être utilisé par les clients.`
            : undefined
        }
        confirmLabel="Supprimer"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.huge,
    gap: spacing.md,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  card: { gap: spacing.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  codeBox: {
    backgroundColor: colors.black,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { marginVertical: spacing.sm },
  usageRow: { gap: spacing.xs },
  usageTrack: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  usageFill: { height: 5, borderRadius: radius.pill },
  field: { gap: spacing.sm },
  chips: { flexDirection: 'row', gap: spacing.sm },
});
