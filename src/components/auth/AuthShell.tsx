import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Reveal } from '@/components/ui';
import { STORE } from '@/data/constants';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { colors, radius, spacing } from '@/theme';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Cadre commun aux écrans d'authentification : logo, titre, formulaire.
 * Le clavier ne doit jamais masquer le champ actif (section 28).
 */
export const AuthShell = ({ title, subtitle, children, footer }: AuthShellProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { screenPadding, isCompact } = useBreakpoint();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.md,
            paddingHorizontal: screenPadding,
            maxWidth: isCompact ? '100%' : 460,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
        </View>

        <Reveal>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="logo-apple" size={26} color={colors.white} />
            </View>
            <AppText variant="captionStrong" color={colors.muted}>
              {STORE.name}
            </AppText>
          </View>
        </Reveal>

        <Reveal delay={80}>
          <View style={styles.heading}>
            <AppText variant="title" center>
              {title}
            </AppText>
            <AppText variant="caption" center style={styles.subtitle}>
              {subtitle}
            </AppText>
          </View>
        </Reveal>

        <Reveal delay={140}>
          <View style={styles.form}>{children}</View>
        </Reveal>

        {footer ? (
          <Reveal delay={220}>
            <View style={styles.footer}>{footer}</View>
          </Reveal>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: {
    paddingBottom: spacing.huge,
    gap: spacing.xl,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: { flexDirection: 'row', marginLeft: -spacing.sm },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6, backgroundColor: colors.surfaceSunken },
  brand: { alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { gap: spacing.xs },
  subtitle: { maxWidth: 320, alignSelf: 'center' },
  form: { gap: spacing.lg },
  footer: { gap: spacing.md, alignItems: 'center' },
});
