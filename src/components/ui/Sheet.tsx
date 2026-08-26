import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing } from '@/theme';
import { AppText } from './AppText';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Barre d'actions collée en bas de la feuille. */
  footer?: ReactNode;
  fullHeight?: boolean;
}

/** Feuille modale ancrée en bas de l'écran, utilisée pour filtres et formulaires. */
export const Sheet = ({ visible, onClose, title, children, footer, fullHeight = false }: SheetProps) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />

        <View
          style={[
            styles.sheet,
            shadow.lg,
            { maxHeight: fullHeight ? height * 0.94 : height * 0.82, paddingBottom: insets.bottom },
          ]}
        >
          <View style={styles.grabber} />

          {title ? (
            <View style={styles.header}>
              <AppText variant="subheading">{title}</AppText>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                style={styles.close}
              >
                <Ionicons name="close" size={20} color={colors.inkSoft} />
              </Pressable>
            </View>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
};

/**
 * Boîte de dialogue de confirmation. Le cahier des charges impose une
 * confirmation avant toute suppression (section 28).
 */
export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.centeredOverlay}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Annuler" />

      <View style={[styles.dialog, shadow.lg]}>
        <AppText variant="subheading" center>
          {title}
        </AppText>

        {message ? (
          <AppText variant="caption" center>
            {message}
          </AppText>
        ) : null}

        <View style={styles.dialogActions}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.dialogButton, pressed ? { opacity: 0.7 } : null]}
            accessibilityRole="button"
          >
            <AppText variant="bodyStrong" color={colors.inkSoft}>
              {cancelLabel}
            </AppText>
          </Pressable>

          <View style={styles.dialogSeparator} />

          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [styles.dialogButton, pressed ? { opacity: 0.7 } : null]}
            accessibilityRole="button"
          >
            <AppText variant="bodyStrong" color={destructive ? colors.danger : colors.primary}>
              {confirmLabel}
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  centeredOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.sm,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.xl, gap: spacing.lg },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  dialogActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  dialogButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  dialogSeparator: { width: 1, backgroundColor: colors.border },
});
