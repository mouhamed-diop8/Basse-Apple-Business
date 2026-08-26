import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { AppText, Card, Input } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { CheckoutContact, useCheckoutStore } from '@/store/checkout';
import { colors, spacing } from '@/theme';
import { FieldErrors, isValidEmail, isValidPhone, required } from '@/utils/validation';

export default function CheckoutContactScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const lines = useCartStore((state) => state.lines);

  const contact = useCheckoutStore((state) => state.contact);
  const setContact = useCheckoutStore((state) => state.setContact);

  const [errors, setErrors] = useState<FieldErrors<keyof CheckoutContact>>({});

  // Le panier a pu être vidé depuis un autre écran : on ne reste pas bloqué ici.
  useEffect(() => {
    if (lines.length === 0) router.replace('/panier');
  }, [lines.length, router]);

  // Pré-remplissage depuis le compte connecté, sans écraser une saisie en cours.
  useEffect(() => {
    if (!user) return;

    setContact({
      first_name: contact.first_name || user.first_name,
      last_name: contact.last_name || user.last_name,
      email: contact.email || user.email,
      phone: contact.phone || user.phone,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const validate = (): boolean => {
    const next: FieldErrors<keyof CheckoutContact> = {
      first_name: required(contact.first_name, 'Le prénom'),
      last_name: required(contact.last_name, 'Le nom'),
      phone: !contact.phone.trim()
        ? 'Le téléphone est obligatoire.'
        : !isValidPhone(contact.phone)
          ? 'Numéro de téléphone invalide.'
          : undefined,
      email: !contact.email.trim()
        ? "L'email est obligatoire."
        : !isValidEmail(contact.email)
          ? 'Adresse email invalide.'
          : undefined,
    };

    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  return (
    <CheckoutShell
      step={0}
      title="Vos informations"
      subtitle="Elles nous servent à vous contacter au sujet de la livraison."
      ctaLabel="Continuer vers l’adresse"
      onContinue={() => {
        if (validate()) router.push('/commande/adresse');
      }}
    >
      <Card style={styles.card}>
        <View style={styles.row}>
          <Input
            label="Prénom"
            required
            value={contact.first_name}
            onChangeText={(value) => setContact({ first_name: value })}
            error={errors.first_name}
            autoCapitalize="words"
            containerStyle={styles.half}
            textContentType="givenName"
          />

          <Input
            label="Nom"
            required
            value={contact.last_name}
            onChangeText={(value) => setContact({ last_name: value })}
            error={errors.last_name}
            autoCapitalize="words"
            containerStyle={styles.half}
            textContentType="familyName"
          />
        </View>

        <Input
          label="Téléphone"
          required
          value={contact.phone}
          onChangeText={(value) => setContact({ phone: value })}
          error={errors.phone}
          keyboardType="phone-pad"
          icon="call-outline"
          hint="Le livreur vous appellera sur ce numéro."
          placeholder="+221 77 000 00 00"
          textContentType="telephoneNumber"
        />

        <Input
          label="Email"
          required
          value={contact.email}
          onChangeText={(value) => setContact({ email: value })}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          icon="mail-outline"
          hint="La confirmation d’achat s’affiche à la fin, avec votre billet à télécharger."
          textContentType="emailAddress"
        />
      </Card>

      {!user ? (
        <AppText variant="micro" color={colors.muted} center>
          Vous commandez sans compte. Créez-en un depuis l’onglet Profil pour suivre vos
          commandes et retrouver vos adresses.
        </AppText>
      ) : null}
    </CheckoutShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
});
