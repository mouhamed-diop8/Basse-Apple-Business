import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  tone?: 'neutral' | 'danger';
  style?: ViewStyle;
}

/**
 * Écran vide générique. Le cahier des charges (section 32) impose de ne jamais
 * laisser une page vide sans explication : tous les écrans passent par ici.
 */
export const EmptyState = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  tone = 'neutral',
  style,
}: EmptyStateProps) => (
  <View style={[styles.container, style]}>
    <View
      style={[
        styles.iconCircle,
        tone === 'danger' ? { backgroundColor: colors.dangerSoft } : null,
      ]}
    >
      <Ionicons
        name={icon}
        size={30}
        color={tone === 'danger' ? colors.danger : colors.muted}
      />
    </View>

    <AppText variant="subheading" center>
      {title}
    </AppText>

    {message ? (
      <AppText variant="caption" center style={styles.message}>
        {message}
      </AppText>
    ) : null}

    {actionLabel && onAction ? (
      <Button label={actionLabel} onPress={onAction} style={styles.action} />
    ) : null}

    {secondaryActionLabel && onSecondaryAction ? (
      <Button
        label={secondaryActionLabel}
        variant="ghost"
        size="sm"
        onPress={onSecondaryAction}
      />
    ) : null}
  </View>
);

/** Erreur réseau ou serveur, avec possibilité de relancer la requête. */
export const ErrorState = ({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) => (
  <EmptyState
    icon="cloud-offline-outline"
    tone="danger"
    title="Connexion impossible"
    message={message ?? 'Vérifiez votre connexion internet puis réessayez.'}
    actionLabel={onRetry ? 'Réessayer' : undefined}
    onAction={onRetry}
  />
);

export const LoadingState = ({ label }: { label?: string }) => (
  <View style={styles.container}>
    <ActivityIndicator color={colors.primary} />
    {label ? (
      <AppText variant="caption" center>
        {label}
      </AppText>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { maxWidth: 320 },
  action: { marginTop: spacing.sm, minWidth: 200 },
});
