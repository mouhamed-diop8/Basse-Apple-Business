import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { AppText, Card, Input, SwitchRow } from '@/components/ui';
import { useAddressesStore } from '@/store/addresses';
import { useAuthStore } from '@/store/auth';
import { CheckoutAddress, useCheckoutStore } from '@/store/checkout';
import { colors, radius, spacing } from '@/theme';
import { FieldErrors, required } from '@/utils/validation';

export default function CheckoutAddressScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const address = useCheckoutStore((state) => state.address);
  const setAddress = useCheckoutStore((state) => state.setAddress);
  const contact = useCheckoutStore((state) => state.contact);

  const savedAddresses = useAddressesStore((state) => state.items);
  const saveAddress = useAddressesStore((state) => state.save);

  const [errors, setErrors] = useState<FieldErrors<keyof CheckoutAddress>>({});
  const [saveForLater, setSaveForLater] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Adresse par défaut proposée d'emblée aux clients connectés.
  useEffect(() => {
    if (!user || address.address || savedAddresses.length === 0) return;

    const preferred = savedAddresses.find((item) => item.is_default) ?? savedAddresses[0];
    setSelectedId(preferred.id);
    setAddress({
      address: preferred.address,
      city: preferred.city,
      district: preferred.district,
      country: preferred.country,
      instructions: preferred.instructions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, savedAddresses.length]);

  const validate = (): boolean => {
    const next: FieldErrors<keyof CheckoutAddress> = {
      address: required(address.address, "L'adresse"),
      city: required(address.city, 'La ville'),
      country: required(address.country, 'Le pays'),
    };

    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const submit = () => {
    if (!validate()) return;

    if (saveForLater && user) {
      saveAddress({
        label: address.city || 'Adresse',
        first_name: contact.first_name,
        last_name: contact.last_name,
        phone: contact.phone,
        email: contact.email,
        ...address,
        is_default: savedAddresses.length === 0,
      });
    }

    router.push('/commande/livraison');
  };

  return (
    <CheckoutShell
      step={1}
      title="Adresse de livraison"
      subtitle="Indiquez où nous devons livrer votre commande."
      ctaLabel="Continuer vers la livraison"
      onContinue={submit}
    >
      {user && savedAddresses.length > 0 ? (
        <View style={styles.saved}>
          <AppText variant="captionStrong">Mes adresses enregistrées</AppText>

          {savedAddresses.map((item) => {
            const selected = selectedId === item.id;

            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSelectedId(item.id);
                  setAddress({
                    address: item.address,
                    city: item.city,
                    district: item.district,
                    country: item.country,
                    instructions: item.instructions,
                  });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.savedRow,
                  selected ? styles.savedRowSelected : null,
                  pressed ? { opacity: 0.9 } : null,
                ]}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selected ? colors.primary : colors.mutedLight}
                />

                <View style={styles.savedBody}>
                  <AppText variant="captionStrong">{item.label}</AppText>
                  <AppText variant="micro" color={colors.muted} numberOfLines={2}>
                    {item.address}, {item.city} {item.district ? `· ${item.district}` : ''}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Card style={styles.card}>
        <Input
          label="Adresse"
          required
          value={address.address}
          onChangeText={(value) => {
            setSelectedId(null);
            setAddress({ address: value });
          }}
          error={errors.address}
          icon="location-outline"
          placeholder="Villa, rue, cité, immeuble"
          textContentType="fullStreetAddress"
        />

        <View style={styles.row}>
          <Input
            label="Ville"
            required
            value={address.city}
            onChangeText={(value) => setAddress({ city: value })}
            error={errors.city}
            containerStyle={styles.half}
            autoCapitalize="words"
            placeholder="Dakar"
            textContentType="addressCity"
          />

          <Input
            label="Quartier"
            value={address.district}
            onChangeText={(value) => setAddress({ district: value })}
            containerStyle={styles.half}
            autoCapitalize="words"
            placeholder="Keur Massar, Plateau…"
          />
        </View>

        <Input
          label="Pays"
          required
          value={address.country}
          onChangeText={(value) => setAddress({ country: value })}
          error={errors.country}
          icon="flag-outline"
          textContentType="countryName"
        />

        <Input
          label="Instructions de livraison"
          value={address.instructions}
          onChangeText={(value) => setAddress({ instructions: value })}
          placeholder="Code d’accès, étage, créneau souhaité…"
          multiline
          numberOfLines={3}
          hint="Facultatif, mais très utile au livreur."
        />
      </Card>

      {user ? (
        <Card padded={false}>
          <SwitchRow
            label="Enregistrer cette adresse"
            description="Elle sera proposée lors de vos prochaines commandes."
            value={saveForLater}
            onChange={setSaveForLater}
          />
        </Card>
      ) : null}
    </CheckoutShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  saved: { gap: spacing.sm },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  savedRowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  savedBody: { flex: 1, gap: 2 },
});
