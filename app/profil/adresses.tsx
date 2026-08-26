import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  ScreenHeader,
  Sheet,
} from '@/components/ui';
import { SavedAddress } from '@/data/types';
import { useAddressesStore } from '@/store/addresses';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';
import { isValidPhone, required } from '@/utils/validation';

type Field = 'label' | 'first_name' | 'last_name' | 'phone' | 'address' | 'city' | 'country';

const emptyForm = {
  label: '',
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  district: '',
  country: 'Sénégal',
  instructions: '',
};

export default function AddressesScreen() {
  const items = useAddressesStore((state) => state.items);
  const save = useAddressesStore((state) => state.save);
  const remove = useAddressesStore((state) => state.remove);
  const setDefault = useAddressesStore((state) => state.setDefault);
  const user = useAuthStore((state) => state.user);

  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [pendingDelete, setPendingDelete] = useState<SavedAddress | null>(null);

  const openCreate = () => {
    setEditing(null);
    setErrors({});
    setForm({
      ...emptyForm,
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
    });
    setSheetOpen(true);
  };

  const openEdit = (address: SavedAddress) => {
    setEditing(address);
    setErrors({});
    setForm({
      label: address.label,
      first_name: address.first_name,
      last_name: address.last_name,
      phone: address.phone,
      email: address.email,
      address: address.address,
      city: address.city,
      district: address.district,
      country: address.country,
      instructions: address.instructions,
    });
    setSheetOpen(true);
  };

  const set = (field: keyof typeof emptyForm) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = () => {
    const next: Partial<Record<Field, string>> = {
      label: required(form.label, 'Le libellé'),
      first_name: required(form.first_name, 'Le prénom'),
      last_name: required(form.last_name, 'Le nom'),
      phone: isValidPhone(form.phone) ? undefined : 'Numéro de téléphone invalide.',
      address: required(form.address, 'L’adresse'),
      city: required(form.city, 'La ville'),
      country: required(form.country, 'Le pays'),
    };

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    save({
      ...form,
      id: editing?.id,
      is_default: editing?.is_default ?? items.length === 0,
    });

    toast.success(editing ? 'Adresse mise à jour.' : 'Adresse enregistrée.');
    setSheetOpen(false);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Mes adresses"
        subtitle={items.length > 0 ? `${items.length} enregistrée(s)` : undefined}
        withStatusBar
        right={
          <Pressable
            onPress={openCreate}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Ajouter une adresse"
            style={({ pressed }) => [styles.addButton, pressed ? styles.pressed : null]}
          >
            <Ionicons name="add" size={22} color={colors.ink} />
          </Pressable>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title="Aucune adresse enregistrée"
          message="Enregistrez une adresse pour accélérer vos prochaines commandes."
          actionLabel="Ajouter une adresse"
          onAction={openCreate}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <Card key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <AppText variant="bodyStrong">{item.label}</AppText>
                  {item.is_default ? <Badge label="Par défaut" tone="primary" /> : null}
                </View>

                <Pressable
                  onPress={() => openEdit(item)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Modifier ${item.label}`}
                >
                  <Ionicons name="create-outline" size={19} color={colors.inkSoft} />
                </Pressable>
              </View>

              <AppText variant="caption" style={styles.cardText}>
                {item.first_name} {item.last_name}
                {'\n'}
                {item.address}
                {'\n'}
                {item.city} {item.district ? `· ${item.district}` : ''}
                {'\n'}
                {item.country}
                {'\n'}
                {item.phone}
              </AppText>

              <View style={styles.cardActions}>
                {!item.is_default ? (
                  <Button
                    label="Définir par défaut"
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setDefault(item.id);
                      toast.success('Adresse par défaut mise à jour.');
                    }}
                    style={styles.flex}
                  />
                ) : null}

                <Button
                  label="Supprimer"
                  variant="ghost"
                  size="sm"
                  icon="trash-outline"
                  onPress={() => setPendingDelete(item)}
                />
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Modifier l’adresse' : 'Nouvelle adresse'}
        fullHeight
        footer={
          <Button
            label={editing ? 'Enregistrer' : 'Ajouter l’adresse'}
            onPress={submit}
            fullWidth
            size="lg"
          />
        }
      >
        <Input
          label="Libellé"
          placeholder="Domicile, Bureau…"
          value={form.label}
          onChangeText={set('label')}
          error={errors.label}
          required
        />

        <View style={styles.row}>
          <Input
            label="Prénom"
            value={form.first_name}
            onChangeText={set('first_name')}
            error={errors.first_name}
            containerStyle={styles.flex}
            required
          />
          <Input
            label="Nom"
            value={form.last_name}
            onChangeText={set('last_name')}
            error={errors.last_name}
            containerStyle={styles.flex}
            required
          />
        </View>

        <Input
          label="Téléphone"
          icon="call-outline"
          value={form.phone}
          onChangeText={set('phone')}
          error={errors.phone}
          keyboardType="phone-pad"
          required
        />

        <Input
          label="Adresse"
          placeholder="Numéro, rue, complément"
          value={form.address}
          onChangeText={set('address')}
          error={errors.address}
          multiline
          required
        />

        <View style={styles.row}>
          <Input
            label="Ville"
            value={form.city}
            onChangeText={set('city')}
            error={errors.city}
            containerStyle={styles.flex}
            required
          />
          <Input
            label="Quartier"
            value={form.district}
            onChangeText={set('district')}
            containerStyle={styles.flex}
          />
        </View>

        <Input
          label="Pays"
          value={form.country}
          onChangeText={set('country')}
          error={errors.country}
          required
        />

        <Input
          label="Instructions de livraison"
          placeholder="Code d’entrée, étage, point de repère…"
          value={form.instructions}
          onChangeText={set('instructions')}
          multiline
          hint="Optionnel, transmis au livreur."
        />
      </Sheet>

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Supprimer cette adresse ?"
        message={pendingDelete ? `« ${pendingDelete.label} » sera définitivement supprimée.` : undefined}
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => {
          if (pendingDelete) remove(pendingDelete.id);
          setPendingDelete(null);
          toast.info('Adresse supprimée.');
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6, backgroundColor: colors.surfaceSunken },
  card: { gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardText: { lineHeight: 20 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
});
