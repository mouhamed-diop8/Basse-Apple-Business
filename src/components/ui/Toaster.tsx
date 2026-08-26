import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast, ToastVariant, useToastStore } from '@/store/toast';
import { colors, radius, shadow, spacing } from '@/theme';
import { AppText } from './AppText';

const ICONS: Record<ToastVariant, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

const TINTS: Record<ToastVariant, string> = {
  success: colors.success,
  error: colors.danger,
  info: colors.primary,
};

const ToastCard = ({ toast }: { toast: Toast }) => {
  const dismiss = useToastStore((state) => state.dismiss);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      style={[
        styles.toast,
        shadow.lg,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) },
          ],
        },
      ]}
    >
      <Ionicons name={ICONS[toast.variant]} size={20} color={TINTS[toast.variant]} />

      <AppText variant="captionStrong" color={colors.white} style={styles.message}>
        {toast.message}
      </AppText>

      {toast.actionLabel && toast.onAction ? (
        <Pressable
          onPress={() => {
            toast.onAction?.();
            dismiss(toast.id);
          }}
          hitSlop={8}
          accessibilityRole="button"
        >
          <AppText variant="captionStrong" color={colors.primary}>
            {toast.actionLabel}
          </AppText>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => dismiss(toast.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Fermer la notification"
        >
          <Ionicons name="close" size={16} color={colors.mutedLight} />
        </Pressable>
      )}
    </Animated.View>
  );
};

/**
 * Zone d'affichage des retours immédiats (ajout au panier, erreurs).
 * Monté une seule fois dans le layout racine.
 */
export const Toaster = () => {
  const toasts = useToastStore((state) => state.toasts);
  const insets = useSafeAreaInsets();

  if (!toasts.length) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + spacing.sm }]}
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    zIndex: 1000,
  },
  toast: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(18,18,20,0.97)',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  message: { flex: 1 },
});
