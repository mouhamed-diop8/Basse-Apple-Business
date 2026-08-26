import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { AppText, Button, Input } from '@/components/ui';
import { db } from '@/data';
import { RepositoryError } from '@/data/repository';
import { toast } from '@/store/toast';
import { colors, radius, spacing } from '@/theme';
import { checkPassword, isValidEmail } from '@/utils/validation';

type Step = 'request' | 'verify';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const requestCode = async () => {
    if (!isValidEmail(email)) {
      setError('Adresse email invalide.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await db.requestPasswordReset(email.trim());
      setHint(
        result.hint ??
          'Si un compte existe pour cette adresse, un code de vérification vient d’être envoyé.',
      );
      setStep('verify');
    } catch (caught) {
      setError(
        caught instanceof RepositoryError
          ? caught.message
          : 'L’envoi a échoué. Vérifiez votre connexion.',
      );
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (code.trim().length < 4) {
      setError('Saisissez le code reçu par email.');
      return;
    }

    const strength = checkPassword(password);
    if (!strength.valid) {
      setError(strength.message);
      return;
    }

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await db.resetPassword(email.trim(), code, password);
      toast.success('Mot de passe mis à jour. Vous pouvez vous connecter.');
      router.replace('/auth/connexion');
    } catch (caught) {
      setError(
        caught instanceof RepositoryError
          ? caught.message
          : 'La réinitialisation a échoué. Réessayez.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={step === 'request' ? 'Mot de passe oublié' : 'Nouveau mot de passe'}
      subtitle={
        step === 'request'
          ? 'Indiquez votre adresse email : nous vous envoyons un code de vérification.'
          : 'Saisissez le code reçu puis choisissez un nouveau mot de passe.'
      }
      footer={
        <Pressable
          onPress={() => router.replace('/auth/connexion')}
          hitSlop={8}
          accessibilityRole="button"
        >
          <AppText variant="captionStrong" color={colors.primary}>
            Retour à la connexion
          </AppText>
        </Pressable>
      }
    >
      {step === 'request' ? (
        <>
          <Input
            label="Email"
            placeholder="vous@exemple.com"
            icon="mail-outline"
            value={email}
            onChangeText={(value) => {
              setError(null);
              setEmail(value);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            onSubmitEditing={requestCode}
            returnKeyType="send"
          />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <AppText variant="caption" color={colors.danger} style={styles.flex}>
                {error}
              </AppText>
            </View>
          ) : null}

          <Button
            label="Recevoir un code"
            onPress={requestCode}
            loading={busy}
            fullWidth
            size="lg"
          />
        </>
      ) : (
        <>
          {hint ? (
            <View style={styles.hintBox}>
              <Ionicons name="mail-open-outline" size={16} color={colors.primary} />
              <AppText variant="caption" color={colors.primary} style={styles.flex}>
                {hint}
              </AppText>
            </View>
          ) : null}

          <Input
            label="Code de vérification"
            placeholder="123456"
            icon="keypad-outline"
            value={code}
            onChangeText={(value) => {
              setError(null);
              setCode(value.replace(/\D/g, '').slice(0, 6));
            }}
            keyboardType="number-pad"
            maxLength={6}
          />

          <Input
            label="Nouveau mot de passe"
            placeholder="8 caractères minimum"
            icon="lock-closed-outline"
            password
            value={password}
            onChangeText={(value) => {
              setError(null);
              setPassword(value);
            }}
            autoComplete="new-password"
          />

          <Input
            label="Confirmer le mot de passe"
            placeholder="••••••••"
            icon="lock-closed-outline"
            password
            value={confirm}
            onChangeText={(value) => {
              setError(null);
              setConfirm(value);
            }}
            autoComplete="new-password"
            onSubmitEditing={resetPassword}
            returnKeyType="go"
          />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <AppText variant="caption" color={colors.danger} style={styles.flex}>
                {error}
              </AppText>
            </View>
          ) : null}

          <Button
            label="Réinitialiser le mot de passe"
            onPress={resetPassword}
            loading={busy}
            fullWidth
            size="lg"
          />

          <Pressable
            onPress={() => {
              setStep('request');
              setCode('');
              setError(null);
            }}
            hitSlop={8}
            accessibilityRole="button"
            style={styles.center}
          >
            <AppText variant="caption" color={colors.muted}>
              Changer d’adresse email
            </AppText>
          </Pressable>
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignSelf: 'center' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
