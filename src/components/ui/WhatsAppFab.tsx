import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { Linking, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STORE, whatsappUrl } from '@/data/constants';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { toast } from '@/store/toast';
import { colors, radius, shadow, spacing } from '@/theme';

/**
 * Accès direct WhatsApp, le canal le plus utilisé à Dakar.
 * Masqué dans l’espace admin et les écrans d’authentification.
 */
export const WhatsAppFab = () => {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();

  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/commande/')
  ) {
    return null;
  }

  const open = () => {
    const message = `Bonjour ${STORE.name}, j’ai une question.`;
    Linking.openURL(whatsappUrl(message)).catch(() =>
      toast.error('WhatsApp n’est pas disponible sur cet appareil.'),
    );
  };

  const bottom = isDesktop ? spacing.xxl : Math.max(insets.bottom, spacing.md) + 72;

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel="Contacter la boutique sur WhatsApp"
      style={({ pressed }) => [
        styles.fab,
        shadow.md,
        { bottom, right: spacing.lg, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <Ionicons name="logo-whatsapp" size={28} color={colors.white} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
});
