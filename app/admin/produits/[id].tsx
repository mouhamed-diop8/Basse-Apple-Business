import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ProductVisual } from '@/components/product/ProductVisual';
import {
  AppText,
  Button,
  Card,
  Chip,
  Divider,
  ErrorState,
  Input,
  ListSkeleton,
  ScreenHeader,
  SwitchRow,
} from '@/components/ui';
import { db } from '@/data';
import { ProductDraft, RepositoryError } from '@/data/repository';
import { Product, ProductCondition, SpecEntry } from '@/data/types';
import { useAsync } from '@/hooks/useAsync';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';

type FormState = {
  name: string;
  brand: string;
  category_id: string;
  description: string;
  price: string;
  sale_price: string;
  stock: string;
  low_stock_threshold: string;
  sku: string;
  warranty: string;
  condition: ProductCondition;
  is_active: boolean;
  is_featured: boolean;
  storage_gb: string;
  ram_gb: string;
  screen_inches: string;
  return_policy: string;
  shipping_note: string;
};

const initialForm: FormState = {
  name: '',
  brand: '',
  category_id: '',
  description: '',
  price: '',
  sale_price: '',
  stock: '0',
  low_stock_threshold: '3',
  sku: '',
  warranty: 'Garantie constructeur 12 mois',
  condition: 'new',
  is_active: true,
  is_featured: false,
  storage_gb: '',
  ram_gb: '',
  screen_inches: '',
  return_policy: 'Retour accepté sous 14 jours, produit non ouvert.',
  shipping_note: 'Expédié depuis Dakar (Keur Massar). Suivi WhatsApp inclus.',
};

const numberOrNull = (value: string): number | null => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && value.trim() !== '' ? parsed : null;
};

export default function AdminProductFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isNew = id === 'nouveau';

  const { data: categories } = useAsync(() => db.getCategories(), []);
  const {
    data: product,
    loading,
    error,
    reload,
  } = useAsync(() => (isNew ? Promise.resolve(null) : db.getProductById(id)), [id]);

  const [form, setForm] = useState<FormState>(initialForm);
  const [images, setImages] = useState<string[]>([]);
  const [accessories, setAccessories] = useState<string[]>([]);
  const [accessoryDraft, setAccessoryDraft] = useState('');
  const [specs, setSpecs] = useState<SpecEntry[]>([]);
  const [specDraft, setSpecDraft] = useState({ label: '', value: '' });
  const [productColors, setProductColors] = useState<string[]>([]);
  const [colorDraft, setColorDraft] = useState('');
  const [imageDraft, setImageDraft] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) return;

    setForm({
      name: product.name,
      brand: product.brand,
      category_id: product.category_id,
      description: product.description,
      price: String(product.price),
      sale_price: product.sale_price ? String(product.sale_price) : '',
      stock: String(product.stock),
      low_stock_threshold: String(product.low_stock_threshold),
      sku: product.sku,
      warranty: product.warranty,
      condition: product.condition,
      is_active: product.is_active,
      is_featured: product.is_featured,
      storage_gb: product.storage_gb ? String(product.storage_gb) : '',
      ram_gb: product.ram_gb ? String(product.ram_gb) : '',
      screen_inches: product.screen_inches ? String(product.screen_inches) : '',
      return_policy: product.return_policy,
      shipping_note: product.shipping_note,
    });

    setImages(product.images);
    setAccessories(product.included_accessories);
    setSpecs(product.specs);
    setProductColors(product.colors);
  }, [product]);

  const set = <K extends keyof FormState>(field: K) => (value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      toast.error('Autorisez l’accès aux photos pour ajouter une image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages((current) => [...current, ...result.assets.map((asset) => asset.uri)]);
    }
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) next.name = 'Le nom est obligatoire.';
    if (!form.brand.trim()) next.brand = 'La marque est obligatoire.';
    if (!form.category_id) next.category_id = 'Choisissez une catégorie.';
    if (!form.description.trim()) next.description = 'La description est obligatoire.';

    const price = numberOrNull(form.price);
    if (price === null || price <= 0) next.price = 'Indiquez un prix supérieur à 0.';

    const sale = numberOrNull(form.sale_price);
    if (form.sale_price.trim() && (sale === null || sale <= 0)) {
      next.sale_price = 'Prix promotionnel invalide.';
    } else if (sale !== null && price !== null && sale >= price) {
      next.sale_price = 'Le prix promotionnel doit être inférieur au prix normal.';
    }

    const stock = numberOrNull(form.stock);
    if (stock === null || stock < 0) next.stock = 'Stock invalide.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) {
      toast.error('Certains champs sont incomplets.');
      return;
    }

    setSaving(true);

    const draft: ProductDraft = {
      ...(isNew ? {} : { id: (product as Product).id }),
      name: form.name.trim(),
      description: form.description.trim(),
      brand: form.brand.trim(),
      category_id: form.category_id,
      price: numberOrNull(form.price) ?? 0,
      sale_price: form.sale_price.trim() ? numberOrNull(form.sale_price) : null,
      stock: numberOrNull(form.stock) ?? 0,
      low_stock_threshold: numberOrNull(form.low_stock_threshold) ?? 3,
      sku: form.sku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`,
      warranty: form.warranty.trim(),
      condition: form.condition,
      is_active: form.is_active,
      is_featured: form.is_featured,
      return_policy: form.return_policy.trim(),
      shipping_note: form.shipping_note.trim(),
      included_accessories: accessories,
      specs,
      storage_gb: numberOrNull(form.storage_gb),
      ram_gb: numberOrNull(form.ram_gb),
      screen_inches: numberOrNull(form.screen_inches),
      colors: productColors,
      images,
      variants: product?.variants ?? [],
    };

    try {
      await db.adminSaveProduct(draft);
      toast.success(isNew ? 'Produit ajouté au catalogue.' : 'Produit mis à jour.');
      router.replace('/admin/produits');
    } catch (caught) {
      toast.error(
        caught instanceof RepositoryError ? caught.message : 'L’enregistrement a échoué.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Produit" withStatusBar />
        <View style={styles.content}>
          <ListSkeleton count={5} height={92} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Produit" withStatusBar />
        <ErrorState message={error} onRetry={reload} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={isNew ? 'Nouveau produit' : 'Modifier le produit'}
        subtitle={product?.sku}
        withStatusBar
        onBack={() => router.replace('/admin/produits')}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.card}>
            <AppText variant="subheading">Informations générales</AppText>

            <Input
              label="Nom du produit"
              placeholder="iPhone 17 Pro"
              value={form.name}
              onChangeText={set('name')}
              error={errors.name}
              required
            />

            <Input
              label="Marque"
              placeholder="Apple"
              value={form.brand}
              onChangeText={set('brand')}
              error={errors.brand}
              required
            />

            <View style={styles.field}>
              <AppText variant="captionStrong" style={styles.fieldLabel}>
                Catégorie <AppText variant="captionStrong" color={colors.danger}>*</AppText>
              </AppText>

              <View style={styles.chips}>
                {(categories ?? []).map((category) => (
                  <Chip
                    key={category.id}
                    label={category.name}
                    selected={form.category_id === category.id}
                    onPress={() => set('category_id')(category.id)}
                  />
                ))}
              </View>

              {errors.category_id ? (
                <AppText variant="micro" color={colors.danger}>
                  {errors.category_id}
                </AppText>
              ) : null}
            </View>

            <Input
              label="Description"
              placeholder="Décrivez le produit, ses usages et ses atouts."
              value={form.description}
              onChangeText={set('description')}
              error={errors.description}
              multiline
              style={styles.textarea}
              required
            />

            <View style={styles.field}>
              <AppText variant="captionStrong" style={styles.fieldLabel}>
                État
              </AppText>

              <View style={styles.chips}>
                {(['new', 'refurbished'] as ProductCondition[]).map((condition) => (
                  <Chip
                    key={condition}
                    label={condition === 'new' ? 'Neuf' : 'Reconditionné'}
                    selected={form.condition === condition}
                    onPress={() => set('condition')(condition)}
                  />
                ))}
              </View>
            </View>
          </Card>

          <Card style={styles.card}>
            <AppText variant="subheading">Prix et stock</AppText>

            <View style={styles.row}>
              <Input
                label="Prix (F CFA)"
                placeholder="850000"
                value={form.price}
                onChangeText={set('price')}
                error={errors.price}
                keyboardType="decimal-pad"
                containerStyle={styles.flex}
                required
              />

              <Input
                label="Prix promo (F CFA)"
                placeholder="—"
                value={form.sale_price}
                onChangeText={set('sale_price')}
                error={errors.sale_price}
                keyboardType="decimal-pad"
                containerStyle={styles.flex}
              />
            </View>

            <View style={styles.row}>
              <Input
                label="Stock"
                value={form.stock}
                onChangeText={set('stock')}
                error={errors.stock}
                keyboardType="number-pad"
                containerStyle={styles.flex}
                required
              />

              <Input
                label="Seuil d’alerte"
                value={form.low_stock_threshold}
                onChangeText={set('low_stock_threshold')}
                keyboardType="number-pad"
                containerStyle={styles.flex}
                hint="Alerte sous ce seuil"
              />
            </View>

            <Input
              label="Référence (SKU)"
              placeholder="Générée automatiquement si vide"
              value={form.sku}
              onChangeText={set('sku')}
              autoCapitalize="characters"
            />
          </Card>

          <Card style={styles.card}>
            <AppText variant="subheading">Photos</AppText>

            <AppText variant="caption">
              La première image sert de visuel principal. Sans photo, un visuel est généré
              automatiquement.
            </AppText>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.imageRow}>
                {images.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.imageBox}>
                    <ProductVisual
                      uri={uri}
                      productId={form.name || 'draft'}
                      categoryId={form.category_id}
                      size={84}
                    />

                    <Pressable
                      onPress={() => setImages((current) => current.filter((_, i) => i !== index))}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Retirer l’image"
                      style={styles.imageRemove}
                    >
                      <Ionicons name="close" size={13} color={colors.white} />
                    </Pressable>

                    {index === 0 ? (
                      <View style={styles.imageMain}>
                        <AppText variant="micro" color={colors.white}>
                          Principale
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                ))}

                <Pressable
                  onPress={pickImage}
                  accessibilityRole="button"
                  accessibilityLabel="Ajouter une photo"
                  style={styles.imageAdd}
                >
                  <Ionicons name="camera-outline" size={22} color={colors.muted} />
                  <AppText variant="micro" color={colors.muted}>
                    Ajouter
                  </AppText>
                </Pressable>
              </View>
            </ScrollView>

            <View style={styles.inlineForm}>
              <Input
                placeholder="Ou coller une URL d’image"
                value={imageDraft}
                onChangeText={setImageDraft}
                autoCapitalize="none"
                containerStyle={styles.flex}
              />

              <Button
                label="Ajouter"
                variant="outline"
                size="sm"
                onPress={() => {
                  if (!imageDraft.trim()) return;
                  setImages((current) => [...current, imageDraft.trim()]);
                  setImageDraft('');
                }}
              />
            </View>
          </Card>

          <Card style={styles.card}>
            <AppText variant="subheading">Caractéristiques filtrables</AppText>

            <View style={styles.row}>
              <Input
                label="Stockage (Go)"
                placeholder="256"
                value={form.storage_gb}
                onChangeText={set('storage_gb')}
                keyboardType="number-pad"
                containerStyle={styles.flex}
              />

              <Input
                label="RAM (Go)"
                placeholder="8"
                value={form.ram_gb}
                onChangeText={set('ram_gb')}
                keyboardType="number-pad"
                containerStyle={styles.flex}
              />
            </View>

            <Input
              label="Écran (pouces)"
              placeholder="6.3"
              value={form.screen_inches}
              onChangeText={set('screen_inches')}
              keyboardType="decimal-pad"
            />

            <View style={styles.field}>
              <AppText variant="captionStrong" style={styles.fieldLabel}>
                Coloris disponibles
              </AppText>

              <View style={styles.chips}>
                {productColors.map((color) => (
                  <Chip
                    key={color}
                    label={color}
                    removable
                    onPress={() =>
                      setProductColors((current) => current.filter((item) => item !== color))
                    }
                  />
                ))}
              </View>

              <View style={styles.inlineForm}>
                <Input
                  placeholder="Titane naturel"
                  value={colorDraft}
                  onChangeText={setColorDraft}
                  containerStyle={styles.flex}
                />

                <Button
                  label="Ajouter"
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    const value = colorDraft.trim();
                    if (!value || productColors.includes(value)) return;
                    setProductColors((current) => [...current, value]);
                    setColorDraft('');
                  }}
                />
              </View>
            </View>
          </Card>

          <Card style={styles.card}>
            <AppText variant="subheading">Fiche technique</AppText>

            {specs.length > 0 ? (
              <View style={styles.specList}>
                {specs.map((spec, index) => (
                  <View key={`${spec.label}-${index}`}>
                    {index > 0 ? <Divider /> : null}

                    <View style={styles.specRow}>
                      <View style={styles.flex}>
                        <AppText variant="micro" color={colors.muted}>
                          {spec.label}
                        </AppText>
                        <AppText variant="caption" color={colors.ink}>
                          {spec.value}
                        </AppText>
                      </View>

                      <Pressable
                        onPress={() => setSpecs((current) => current.filter((_, i) => i !== index))}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Supprimer ${spec.label}`}
                      >
                        <Ionicons name="close-circle" size={19} color={colors.mutedLight} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.row}>
              <Input
                placeholder="Processeur"
                value={specDraft.label}
                onChangeText={(value) => setSpecDraft((current) => ({ ...current, label: value }))}
                containerStyle={styles.flex}
              />

              <Input
                placeholder="Puce A19 Pro"
                value={specDraft.value}
                onChangeText={(value) => setSpecDraft((current) => ({ ...current, value }))}
                containerStyle={styles.flex}
              />
            </View>

            <Button
              label="Ajouter la caractéristique"
              variant="outline"
              size="sm"
              icon="add"
              onPress={() => {
                if (!specDraft.label.trim() || !specDraft.value.trim()) return;
                setSpecs((current) => [
                  ...current,
                  { label: specDraft.label.trim(), value: specDraft.value.trim() },
                ]);
                setSpecDraft({ label: '', value: '' });
              }}
            />
          </Card>

          <Card style={styles.card}>
            <AppText variant="subheading">Accessoires inclus</AppText>

            <View style={styles.chips}>
              {accessories.map((accessory) => (
                <Chip
                  key={accessory}
                  label={accessory}
                  removable
                  onPress={() =>
                    setAccessories((current) => current.filter((item) => item !== accessory))
                  }
                />
              ))}
            </View>

            <View style={styles.inlineForm}>
              <Input
                placeholder="Câble USB-C, chargeur…"
                value={accessoryDraft}
                onChangeText={setAccessoryDraft}
                containerStyle={styles.flex}
              />

              <Button
                label="Ajouter"
                variant="outline"
                size="sm"
                onPress={() => {
                  const value = accessoryDraft.trim();
                  if (!value || accessories.includes(value)) return;
                  setAccessories((current) => [...current, value]);
                  setAccessoryDraft('');
                }}
              />
            </View>
          </Card>

          <Card style={styles.card}>
            <AppText variant="subheading">Garantie, retour et livraison</AppText>

            <Input label="Garantie" value={form.warranty} onChangeText={set('warranty')} />

            <Input
              label="Politique de retour"
              value={form.return_policy}
              onChangeText={set('return_policy')}
              multiline
            />

            <Input
              label="Information de livraison"
              value={form.shipping_note}
              onChangeText={set('shipping_note')}
              multiline
            />
          </Card>

          <Card padded={false}>
            <SwitchRow
              label="Produit visible"
              description="Masquez le produit sans le supprimer du catalogue."
              value={form.is_active}
              onChange={set('is_active')}
            />
            <Divider />
            <SwitchRow
              label="Mettre en avant"
              description="Affiché sur la page d’accueil dans les sélections."
              value={form.is_featured}
              onChange={set('is_featured')}
            />
          </Card>

          <Button
            label={isNew ? 'Créer le produit' : 'Enregistrer les modifications'}
            onPress={save}
            loading={saving}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  card: { gap: spacing.lg },
  field: { gap: spacing.sm },
  fieldLabel: { marginLeft: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  inlineForm: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  imageRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  imageBox: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  imageRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageMain: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    paddingVertical: 2,
  },
  imageAdd: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  specList: { borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
});
