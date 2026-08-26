import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { AppText, Button, Input } from '@/components/ui';
import { db } from '@/data';
import { DEMO_CREDENTIALS } from '@/data/demo/users';
import { useAuthStore } from '@/store/auth';
import { useFavoritesStore } from '@/store/favorites';
import { toast } from '@/store/toast';
import { colors, radius, spacing } from '@/theme';
import { isValidEmail } from '@/utils/validation';
import { safeInternalPath } from '@/utils/safeRedirect';

export default function SignInScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();

  const signIn = useAuthStore((state) => state.signIn);
  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const syncFavorites = useFavoritesStore((state) => state.syncWithUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const emailError = touched && !isValidEmail(email) ? 'Adresse email invalide.' : null;
  const passwordError = touched && password.length === 0 ? 'Saisissez votre mot de passe.' : null;

  const submit = async () => {
    setTouched(true);
    if (!isValidEmail(email) || password.length === 0) return;

    const ok = await signIn(email.trim(), password);
    if (!ok) return;

    const user = useAuthStore.getState().user;
    if (user) await syncFavorites(user.id);

    toast.success(`Bienvenue ${user?.first_name ?? ''} !`.trim());

    const next = safeInternalPath(redirect);
    if (next) router.replace(next as never);
    else if (user?.role === 'admin') router.replace('/admin');
    else router.replace('/profil');
  };

  const fill = (credentials: { email: string; password: string }) => {
    clearError();
    setTouched(false);
    setEmail(credentials.email);
    setPassword(credentials.password);
  };

  return (
    <AuthShell
      title="Connexion"
      subtitle="Retrouvez vos commandes, vos favoris et vos adresses enregistrées."
      footer={
        <>
          <View style={styles.footerRow}>
            <AppText variant="caption">Pas encore de compte ?</AppText>
            <Pressable
              onPress={() => router.replace('/auth/inscription')}
              hitSlop={8}
              accessibilityRole="button"
            >
              <AppText variant="captionStrong" color={colors.primary}>
                Créer un compte
              </AppText>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.replace('/')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Continuer sans compte"
          >
            <AppText variant="caption" color={colors.muted}>
              Continuer sans compte
            </AppText>
          </Pressable>
        </>
      }
    >
      <Input
        label="Email"
        placeholder="vous@exemple.com"
        icon="mail-outline"
        value={email}
        onChangeText={(value) => {
          clearError();
          setEmail(value);
        }}
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />

      <Input
        label="Mot de passe"
        placeholder="••••••••"
        icon="lock-closed-outline"
        password
        value={password}
        onChangeText={(value) => {
          clearError();
          setPassword(value);
        }}
        error={passwordError}
        autoComplete="password"
        textContentType="password"
        onSubmitEditing={submit}
        returnKeyType="go"
      />

      <Pressable
        onPress={() => router.push('/auth/mot-de-passe-oublie')}
        hitSlop={8}
        accessibilityRole="button"
        style={styles.forgot}
      >
        <AppText variant="captionStrong" color={colors.primary}>
          Mot de passe oublié ?
        </AppText>
      </Pressable>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <AppText variant="caption" color={colors.danger} style={styles.errorText}>
            {error}
          </AppText>
        </View>
      ) : null}

      <Button label="Se connecter" onPress={submit} loading={busy} fullWidth size="lg" haptic />

      {db.mode === 'demo' ? (
        <View style={styles.demoBox}>
          <AppText variant="micro" color={colors.muted}>
            Comptes de démonstration
          </AppText>

          <View style={styles.demoRow}>
            <Button
              label="Client"
              variant="outline"
              size="sm"
              onPress={() => fill(DEMO_CREDENTIALS.customer)}
              style={styles.demoButton}
            />
            <Button
              label="Administrateur"
              variant="outline"
              size="sm"
              onPress={() => fill(DEMO_CREDENTIALS.admin)}
              style={styles.demoButton}
            />
          </View>
        </View>
      ) : null}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-end', marginTop: -spacing.sm },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { flex: 1 },
  demoBox: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  demoRow: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  demoButton: { flex: 1 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
