import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { AppText, Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { useFavoritesStore } from '@/store/favorites';
import { toast } from '@/store/toast';
import { colors, radius, spacing } from '@/theme';
import { checkPassword, isValidEmail, isValidPhone, required, titleCaseName } from '@/utils/validation';

type Field = 'first_name' | 'last_name' | 'email' | 'phone' | 'password' | 'confirm';

/** Barre alignée sur checkPassword : 8 caractères, lettre, chiffre, puis casse et symbole. */
const PasswordMeter = ({ value }: { value: string }) => {
  const lengthOk = value.length >= 8;
  const letterOk = /[a-zA-Z]/.test(value);
  const digitOk = /\d/.test(value);
  const caseOk = /[a-z]/.test(value) && /[A-Z]/.test(value);
  const specialOk = /[^\w\s]/.test(value);

  const valid = lengthOk && letterOk && digitOk;
  const extras = [caseOk, specialOk].filter(Boolean).length;

  const score = !value
    ? 0
    : !valid
      ? 1
      : extras === 0
        ? 2
        : extras === 1
          ? 3
          : 4;

  const labels = ['', 'Faible', 'Correct', 'Bon', 'Excellent'];
  const tints = [colors.border, colors.danger, colors.warning, colors.success, colors.success];

  if (value.length === 0) return null;

  return (
    <View style={styles.meter}>
      <View style={styles.meterTrack}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.meterSegment,
              { backgroundColor: index < score ? tints[score] : colors.surfaceSunken },
            ]}
          />
        ))}
      </View>

      <AppText variant="micro" color={tints[score]}>
        {labels[score]}
      </AppText>
    </View>
  );
};

export default function SignUpScreen() {
  const router = useRouter();

  const signUp = useAuthStore((state) => state.signUp);
  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);
  const pendingConfirmation = useAuthStore((state) => state.pendingConfirmation);
  const clearError = useAuthStore((state) => state.clearError);
  const syncFavorites = useFavoritesStore((state) => state.syncWithUser);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const set = (field: Field) => (value: string) => {
    clearError();
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const capitalize = (field: 'first_name' | 'last_name') => () => {
    setForm((current) => ({ ...current, [field]: titleCaseName(current[field]) }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<Field, string>> = {};

    next.first_name = required(form.first_name, 'Le prénom');
    next.last_name = required(form.last_name, 'Le nom');

    if (!isValidEmail(form.email)) next.email = 'Adresse email invalide.';
    if (!isValidPhone(form.phone)) next.phone = 'Numéro de téléphone invalide.';

    const password = checkPassword(form.password);
    if (!password.valid) next.password = password.message ?? undefined;

    if (form.confirm.length === 0) next.confirm = 'Confirmez votre mot de passe.';
    else if (form.confirm !== form.password) next.confirm = 'Les mots de passe ne correspondent pas.';

    setErrors(next);
    return Object.values(next).every((value) => !value);
  };

  const submit = async () => {
    if (!validate()) return;

    if (!accepted) {
      setTermsError(true);
      toast.error('Cochez la case pour accepter les conditions générales.');
      return;
    }

    const result = await signUp({
      first_name: titleCaseName(form.first_name),
      last_name: titleCaseName(form.last_name),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
    });

    if (result === 'error' || result === 'pending') return;

    const user = useAuthStore.getState().user;
    if (user) await syncFavorites(user.id);

    toast.success('Votre compte a été créé. Bienvenue !');
    router.replace('/profil');
  };

  if (pendingConfirmation) {
    return (
      <AuthShell
        title="Vérifiez votre email"
        subtitle={`Basse Apple Business a envoyé un message à ${pendingConfirmation}. Confirmez votre adresse, puis reconnectez-vous.`}
        footer={
          <Pressable
            onPress={() => router.replace('/auth/connexion')}
            hitSlop={8}
            accessibilityRole="button"
          >
            <AppText variant="captionStrong" color={colors.primary}>
              Aller à la connexion
            </AppText>
          </Pressable>
        }
      >
        <View style={styles.pendingBox}>
          <Ionicons name="mail-open-outline" size={28} color={colors.primary} />
          <AppText variant="caption" center>
            Cherchez un message de Basse Apple Business. Pensez aussi aux courriers indésirables.
          </AppText>
        </View>

        <Button
          label="Retour à la connexion"
          onPress={() => router.replace('/auth/connexion')}
          fullWidth
          size="lg"
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Quelques informations suffisent pour commander, suivre vos livraisons et retrouver vos billets."
      footer={
        <View style={styles.footerRow}>
          <AppText variant="caption">Vous avez déjà un compte ?</AppText>
          <Pressable
            onPress={() => router.replace('/auth/connexion')}
            hitSlop={8}
            accessibilityRole="button"
          >
            <AppText variant="captionStrong" color={colors.primary}>
              Se connecter
            </AppText>
          </Pressable>
        </View>
      }
    >
      <View style={styles.row}>
        <Input
          label="Prénom"
          placeholder="Camille"
          value={form.first_name}
          onChangeText={set('first_name')}
          onBlur={capitalize('first_name')}
          error={errors.first_name}
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
          containerStyle={styles.rowItem}
          required
        />

        <Input
          label="Nom"
          placeholder="Bernard"
          value={form.last_name}
          onChangeText={set('last_name')}
          onBlur={capitalize('last_name')}
          error={errors.last_name}
          autoComplete="family-name"
          textContentType="familyName"
          autoCapitalize="words"
          containerStyle={styles.rowItem}
          required
        />
      </View>

      <Input
        label="Email"
        placeholder="vous@exemple.com"
        icon="mail-outline"
        value={form.email}
        onChangeText={set('email')}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        required
      />

      <Input
        label="Téléphone"
        placeholder="+221 77 000 00 00"
        icon="call-outline"
        value={form.phone}
        onChangeText={set('phone')}
        error={errors.phone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        hint="Utilisé uniquement pour la livraison et le suivi."
        required
      />

      <View style={styles.passwordGroup}>
        <Input
          label="Mot de passe"
          placeholder="8 caractères, lettre et chiffre"
          icon="lock-closed-outline"
          password
          value={form.password}
          onChangeText={set('password')}
          error={errors.password}
          autoComplete="new-password"
          textContentType="newPassword"
          hint="Minimum 8 caractères, avec au moins une lettre et un chiffre."
          required
        />

        <PasswordMeter value={form.password} />
      </View>

      <Input
        label="Confirmer le mot de passe"
        placeholder="Retapez le mot de passe"
        icon="lock-closed-outline"
        password
        value={form.confirm}
        onChangeText={set('confirm')}
        error={errors.confirm}
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={submit}
        returnKeyType="go"
        required
      />

      <View style={styles.terms}>
        <Pressable
          onPress={() => {
            setAccepted((value) => !value);
            setTermsError(false);
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          accessibilityLabel="Accepter les conditions générales"
          hitSlop={6}
        >
          <View
            style={[
              styles.checkbox,
              accepted ? styles.checkboxChecked : null,
              termsError ? styles.checkboxError : null,
            ]}
          >
            {accepted ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
          </View>
        </Pressable>

        <AppText variant="caption" style={styles.termsText}>
          J’accepte les{' '}
          <AppText
            variant="captionStrong"
            color={colors.primary}
            onPress={() => router.push('/parametres')}
          >
            conditions générales de vente
          </AppText>
          {' '}et la politique de confidentialité.
        </AppText>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <View style={styles.errorText}>
            <AppText variant="caption" color={colors.danger}>
              {error}
            </AppText>
            {error.toLowerCase().includes('existe déjà') ? (
              <Pressable onPress={() => router.replace('/auth/connexion')} hitSlop={6}>
                <AppText variant="captionStrong" color={colors.primary}>
                  Se connecter avec cet email
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <Button
        label="Créer mon compte"
        onPress={submit}
        loading={busy}
        fullWidth
        size="lg"
        haptic
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1 },
  passwordGroup: { gap: spacing.sm },
  meter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs },
  meterTrack: { flexDirection: 'row', gap: 4, flex: 1 },
  meterSegment: { flex: 1, height: 4, borderRadius: radius.pill },
  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxError: { borderColor: colors.danger },
  termsText: { flex: 1 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { flex: 1, gap: spacing.xs },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pendingBox: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.xl,
  },
});
