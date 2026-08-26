import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, Input, Sheet, SwitchRow } from '@/components/ui';
import { Facets } from '@/data/repository';
import { Category, ProductFilters } from '@/data/types';
import { colors, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: ProductFilters;
  facets: Facets | null;
  categories: Category[];
  onApply: (filters: ProductFilters) => void;
  /** Nombre de résultats du filtre courant, affiché sur le bouton de validation. */
  resultCount?: number;
}

const RATING_OPTIONS = [4.5, 4, 3.5, 3];

const storageLabel = (gb: number) => (gb >= 1024 ? `${gb / 1024} To` : `${gb} Go`);

/** Ajoute ou retire une valeur d'un tableau de filtre. */
const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export const FilterSheet = ({
  visible,
  onClose,
  filters,
  facets,
  categories,
  onApply,
  resultCount,
}: FilterSheetProps) => {
  // Édition locale : les filtres ne s'appliquent qu'à la validation.
  const [draft, setDraft] = useState(filters);
  const [minPrice, setMinPrice] = useState(filters.minPrice?.toString() ?? '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice?.toString() ?? '');

  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setMinPrice(filters.minPrice?.toString() ?? '');
      setMaxPrice(filters.maxPrice?.toString() ?? '');
    }
  }, [visible, filters]);

  const parsePrice = (value: string): number | null => {
    const parsed = Number(value.replace(',', '.'));
    return value.trim() && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };

  const apply = () => {
    onApply({ ...draft, minPrice: parsePrice(minPrice), maxPrice: parsePrice(maxPrice) });
    onClose();
  };

  const reset = () => {
    setDraft({
      ...draft,
      categoryIds: [],
      brands: [],
      minPrice: null,
      maxPrice: null,
      inStockOnly: false,
      onSaleOnly: false,
      minRating: null,
      storageOptions: [],
      ramOptions: [],
      screenOptions: [],
      colors: [],
    });
    setMinPrice('');
    setMaxPrice('');
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filtres"
      fullHeight
      footer={
        <View style={styles.footer}>
          <Button label="Réinitialiser" variant="outline" onPress={reset} style={styles.footerButton} />
          <Button
            label={resultCount !== undefined ? `Voir ${resultCount} produits` : 'Appliquer'}
            onPress={apply}
            style={styles.footerButton}
          />
        </View>
      }
    >
      <View style={styles.group}>
        <AppText variant="captionStrong">Catégorie</AppText>
        <View style={styles.chips}>
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              selected={draft.categoryIds.includes(category.id)}
              onPress={() =>
                setDraft({ ...draft, categoryIds: toggle(draft.categoryIds, category.id) })
              }
            />
          ))}
        </View>
      </View>

      {facets?.brands.length ? (
        <View style={styles.group}>
          <AppText variant="captionStrong">Marque</AppText>
          <View style={styles.chips}>
            {facets.brands.map((brand) => (
              <Chip
                key={brand}
                label={brand}
                selected={draft.brands.includes(brand)}
                onPress={() => setDraft({ ...draft, brands: toggle(draft.brands, brand) })}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.group}>
        <AppText variant="captionStrong">Prix</AppText>

        {facets ? (
          <AppText variant="micro" color={colors.muted}>
            Catalogue de {formatPrice(facets.priceRange.min)} à {formatPrice(facets.priceRange.max)}
          </AppText>
        ) : null}

        <View style={styles.priceRow}>
          <Input
            placeholder="Minimum"
            value={minPrice}
            onChangeText={setMinPrice}
            keyboardType="decimal-pad"
            containerStyle={styles.priceInput}
            icon="trending-down-outline"
          />
          <Input
            placeholder="Maximum"
            value={maxPrice}
            onChangeText={setMaxPrice}
            keyboardType="decimal-pad"
            containerStyle={styles.priceInput}
            icon="trending-up-outline"
          />
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="captionStrong">Disponibilité et promotions</AppText>

        <View style={styles.switches}>
          <SwitchRow
            label="En stock uniquement"
            description="Masquer les produits épuisés"
            value={draft.inStockOnly}
            onChange={(value) => setDraft({ ...draft, inStockOnly: value })}
          />
          <SwitchRow
            label="En promotion uniquement"
            description="N’afficher que les produits remisés"
            value={draft.onSaleOnly}
            onChange={(value) => setDraft({ ...draft, onSaleOnly: value })}
          />
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="captionStrong">Note minimum</AppText>
        <View style={styles.chips}>
          {RATING_OPTIONS.map((rating) => (
            <Chip
              key={rating}
              label={`${rating.toFixed(1)} et plus`}
              icon="star"
              selected={draft.minRating === rating}
              onPress={() =>
                setDraft({ ...draft, minRating: draft.minRating === rating ? null : rating })
              }
            />
          ))}
        </View>
      </View>

      {facets?.storages.length ? (
        <View style={styles.group}>
          <AppText variant="captionStrong">Capacité de stockage</AppText>
          <View style={styles.chips}>
            {facets.storages.map((storage) => (
              <Chip
                key={storage}
                label={storageLabel(storage)}
                selected={draft.storageOptions.includes(storage)}
                onPress={() =>
                  setDraft({ ...draft, storageOptions: toggle(draft.storageOptions, storage) })
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      {facets?.rams.length ? (
        <View style={styles.group}>
          <AppText variant="captionStrong">Mémoire RAM</AppText>
          <View style={styles.chips}>
            {facets.rams.map((ram) => (
              <Chip
                key={ram}
                label={`${ram} Go`}
                selected={draft.ramOptions.includes(ram)}
                onPress={() => setDraft({ ...draft, ramOptions: toggle(draft.ramOptions, ram) })}
              />
            ))}
          </View>
        </View>
      ) : null}

      {facets?.screens.length ? (
        <View style={styles.group}>
          <AppText variant="captionStrong">Taille d’écran</AppText>
          <View style={styles.chips}>
            {facets.screens.map((size) => (
              <Chip
                key={size}
                label={`${size}"`}
                selected={draft.screenOptions.includes(size)}
                onPress={() =>
                  setDraft({ ...draft, screenOptions: toggle(draft.screenOptions, size) })
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      {facets?.colors.length ? (
        <View style={styles.group}>
          <AppText variant="captionStrong">Couleur</AppText>
          <View style={styles.chips}>
            {facets.colors.map((color) => (
              <Chip
                key={color}
                label={color}
                selected={draft.colors.includes(color)}
                onPress={() => setDraft({ ...draft, colors: toggle(draft.colors, color) })}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  priceRow: { flexDirection: 'row', gap: spacing.md },
  priceInput: { flex: 1 },
  switches: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: { flexDirection: 'row', gap: spacing.md },
  footerButton: { flex: 1 },
});
