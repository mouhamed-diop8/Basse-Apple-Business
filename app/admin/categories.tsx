import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  ListSkeleton,
  ScreenHeader,
  Sheet,
} from '@/components/ui';
import { db } from '@/data';
import { RepositoryError } from '@/data/repository';
import { Category } from '@/data/types';
import { useAsync } from '@/hooks/useAsync';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';

/** Icônes proposées : le jeu Ionicons couvre tout le catalogue produits. */
const ICON_CHOICES: (keyof typeof Ionicons.glyphMap)[] = [
  'phone-portrait-outline',
  'laptop-outline',
  'tablet-landscape-outline',
  'watch-outline',
  'headset-outline',
  'desktop-outline',
  'keypad-outline',
  'game-controller-outline',
  'camera-outline',
  'hardware-chip-outline',
  'tv-outline',
  'cube-outline',
];

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export default function AdminCategoriesScreen() {
  const router = useRouter();

  const { data, loading, error, refreshing, reload, setData } = useAsync(
    () => db.getCategories(),
    [],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', icon: 'cube-outline' });
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  const categories = data ?? [];

  // Le slug suit le nom tant que l'utilisateur ne l'a pas édité manuellement.
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!slugTouched) setForm((current) => ({ ...current, slug: slugify(current.name) }));
  }, [form.name, slugTouched]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', description: '', icon: 'cube-outline' });
    setErrors({});
    setSlugTouched(false);
    setSheetOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
    });
    setErrors({});
    setSlugTouched(true);
    setSheetOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setErrors({ name: 'Le nom est obligatoire.' });
      return;
    }

    setBusy(true);

    try {
      await db.adminSaveCategory({
        ...(editing ? { id: editing.id } : {}),
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim(),
        icon: form.icon,
        image: editing?.image ?? '',
        position: editing?.position ?? categories.length,
      });

      toast.success(editing ? 'Catégorie mise à jour.' : 'Catégorie créée.');
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

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;

    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    // Mise à jour optimiste : l'ordre est déjà visible pendant l'appel réseau.
    setData(reordered.map((category, position) => ({ ...category, position })));

    try {
      const saved = await db.adminReorderCategories(reordered.map((category) => category.id));
      setData(saved);
    } catch {
      toast.error('Le réordonnancement a échoué.');
      reload();
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      await db.adminDeleteCategory(pendingDelete.id);
      toast.success('Catégorie supprimée.');
      setPendingDelete(null);
      reload();
    } catch (caught) {
      toast.error(
        caught instanceof RepositoryError ? caught.message : 'La suppression a échoué.',
      );
      setPendingDelete(null);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Catégories"
        subtitle={loading ? undefined : `${categories.length} catégorie(s)`}
        withStatusBar
        onBack={() => router.replace('/admin')}
        right={
          <Pressable
            onPress={openCreate}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Ajouter une catégorie"
            style={({ pressed }) => [styles.addButton, pressed ? styles.pressed : null]}
          >
            <Ionicons name="add" size={22} color={colors.white} />
          </Pressable>
        }
      />

      {loading ? (
        <View style={styles.content}>
          <ListSkeleton count={6} height={72} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon="grid-outline"
          title="Aucune catégorie"
          message="Créez vos catégories pour organiser le catalogue et la navigation."
          actionLabel="Créer une catégorie"
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
          <AppText variant="caption" style={styles.hint}>
            L’ordre défini ici est celui affiché aux clients sur la page Catégories.
          </AppText>

          {categories.map((category, index) => (
            <Card key={category.id} style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name={category.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={colors.ink}
                />
              </View>

              <View style={styles.cardBody}>
                <AppText variant="captionStrong">{category.name}</AppText>
                <AppText variant="micro" color={colors.muted} numberOfLines={1}>
                  {category.description || category.slug}
                </AppText>
              </View>

              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => move(index, -1)}
                  disabled={index === 0}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Monter"
                  style={styles.iconButton}
                >
                  <Ionicons
                    name="chevron-up"
                    size={17}
                    color={index === 0 ? colors.mutedLight : colors.inkSoft}
                  />
                </Pressable>

                <Pressable
                  onPress={() => move(index, 1)}
                  disabled={index === categories.length - 1}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Descendre"
                  style={styles.iconButton}
                >
                  <Ionicons
                    name="chevron-down"
                    size={17}
                    color={index === categories.length - 1 ? colors.mutedLight : colors.inkSoft}
                  />
                </Pressable>

                <Pressable
                  onPress={() => openEdit(category)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Modifier ${category.name}`}
                  style={styles.iconButton}
                >
                  <Ionicons name="create-outline" size={17} color={colors.inkSoft} />
                </Pressable>

                <Pressable
                  onPress={() => setPendingDelete(category)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Supprimer ${category.name}`}
                  style={styles.iconButton}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.danger} />
                </Pressable>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        footer={
          <Button
            label={editing ? 'Enregistrer' : 'Créer la catégorie'}
            onPress={save}
            loading={busy}
            fullWidth
            size="lg"
          />
        }
      >
        <Input
          label="Nom"
          placeholder="iPhone, MacBook, Accessoires…"
          value={form.name}
          onChangeText={(value) => {
            setForm((current) => ({ ...current, name: value }));
            setErrors({});
          }}
          error={errors.name}
          required
        />

        <Input
          label="Identifiant (slug)"
          value={form.slug}
          onChangeText={(value) => {
            setSlugTouched(true);
            setForm((current) => ({ ...current, slug: slugify(value) }));
          }}
          autoCapitalize="none"
          hint="Utilisé dans les liens de navigation."
        />

        <Input
          label="Description"
          placeholder="Courte phrase affichée sous le nom"
          value={form.description}
          onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
          multiline
        />

        <View style={styles.iconPicker}>
          <AppText variant="captionStrong">Icône</AppText>

          <View style={styles.iconGrid}>
            {ICON_CHOICES.map((icon) => (
              <Pressable
                key={icon}
                onPress={() => setForm((current) => ({ ...current, icon }))}
                accessibilityRole="button"
                accessibilityLabel={icon}
                accessibilityState={{ selected: form.icon === icon }}
                style={[styles.iconChoice, form.icon === icon ? styles.iconChoiceActive : null]}
              >
                <Ionicons
                  name={icon}
                  size={21}
                  color={form.icon === icon ? colors.white : colors.inkSoft}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <Chip label={`Aperçu : ${form.name || 'Nouvelle catégorie'}`} icon={form.icon as never} />
      </Sheet>

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Supprimer cette catégorie ?"
        message={
          pendingDelete
            ? `« ${pendingDelete.name} » sera supprimée. Les produits associés doivent être reclassés au préalable.`
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
    gap: spacing.sm,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  hint: { marginBottom: spacing.xs },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPicker: { gap: spacing.sm },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconChoice: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChoiceActive: { backgroundColor: colors.black, borderColor: colors.black },
});
