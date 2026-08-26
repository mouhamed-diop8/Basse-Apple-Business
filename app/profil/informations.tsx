import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  Input,
  ScreenHeader,
} from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/store/toast';
import { colors, layout, spacing } from '@/theme';
import { isValidEmail, isValidPhone, required } from '@/utils/validation';

type Field = 'first_name' | 'last_name' | 'email' | 'phone';

export default function ProfileInfoScreen() {
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const busy = useAuthStore((state) => state.busy);

  const [form, setForm] = useState({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  });
  const [avatar, setAvatar] = useState<string | null>(user?.avatar_url ?? null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  if (!user) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Mon profil" withStatusBar />
        <EmptyState
          icon="lock-closed-outline"
          title="Connexion requise"
          message="Connectez-vous pour modifier vos informations personnelles."
          actionLabel="Se connecter"
          onAction={() => router.replace('/auth/connexion')}
        />
      </View>
    );
  }

  const set = (field: Field) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      toast.error('L’accès à vos photos est nécessaire pour changer d’avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
  };

  const submit = async () => {
    const next: Partial<Record<Field, string>> = {
      first_name: required(form.first_name, 'Le prénom'),
      last_name: required(form.last_name, 'Le nom'),
      email: isValidEmail(form.email) ? undefined : 'Adresse email invalide.',
      phone: isValidPhone(form.phone) ? undefined : 'Numéro de téléphone invalide.',
    };

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const ok = await updateProfile({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      avatar_url: avatar,
    });

    if (ok) {
      toast.success('Vos informations ont été mises à jour.');
      router.back();
    } else {
      toast.error(useAuthStore.getState().error ?? 'La mise à jour a échoué.');
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Mes informations" withStatusBar />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarBlock}>
            <Pressable
              onPress={pickAvatar}
              accessibilityRole="button"
              accessibilityLabel="Changer de photo de profil"
              style={({ pressed }) => (pressed ? styles.pressed : undefined)}
            >
              <Avatar
                firstName={form.first_name}
                lastName={form.last_name}
                uri={avatar}
                size={92}
              />
            </Pressable>

            <Pressable onPress={pickAvatar} hitSlop={8} accessibilityRole="button">
              <AppText variant="captionStrong" color={colors.primary}>
                Changer la photo
              </AppText>
            </Pressable>

            {avatar ? (
              <Pressable onPress={() => setAvatar(null)} hitSlop={8} accessibilityRole="button">
                <AppText variant="micro" color={colors.muted}>
                  Retirer la photo
                </AppText>
              </Pressable>
            ) : null}
          </View>

          <Card style={styles.form}>
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
              label="Email"
              icon="mail-outline"
              value={form.email}
              onChangeText={set('email')}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              required
            />

            <Input
              label="Téléphone"
              icon="call-outline"
              value={form.phone}
              onChangeText={set('phone')}
              error={errors.phone}
              keyboardType="phone-pad"
              required
            />
          </Card>

          <Card style={styles.securityCard}>
            <AppText variant="subheading">Sécurité</AppText>
            <AppText variant="caption">
              Pour changer de mot de passe, nous vous envoyons un code de vérification par email.
            </AppText>

            <Button
              label="Changer mon mot de passe"
              variant="outline"
              icon="key-outline"
              onPress={() => router.push('/auth/mot-de-passe-oublie')}
              fullWidth
            />
          </Card>

          <Button
            label="Enregistrer les modifications"
            onPress={submit}
            loading={busy}
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
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  avatarBlock: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  pressed: { opacity: 0.85 },
  form: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  securityCard: { gap: spacing.md },
});
