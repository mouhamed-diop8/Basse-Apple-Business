import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui';
import { Order } from '@/data/types';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { toast } from '@/store/toast';
import { colors, radius, spacing } from '@/theme';
import { downloadOrderTicket, printOrderTicket } from '@/utils/receipt';

interface TicketActionsProps {
  order: Order;
  /** Version compacte pour une carte de liste. */
  compact?: boolean;
}

const run = async (action: () => Promise<void>, success: string) => {
  try {
    await action();
    toast.success(success);
  } catch (error) {
    console.error(error);
    toast.error('Impossible de générer le document. Réessayez.');
  }
};

export const TicketActions = ({ order, compact = false }: TicketActionsProps) => {
  const { isDesktop } = useBreakpoint();
  const [busy, setBusy] = useState<'download' | 'print' | null>(null);

  const download = async () => {
    setBusy('download');
    await run(() => downloadOrderTicket(order), 'PDF téléchargé.');
    setBusy(null);
  };

  const print = async () => {
    setBusy('print');
    await run(() => printOrderTicket(order), 'Aperçu d’impression ouvert.');
    setBusy(null);
  };

  if (compact) {
    return (
      <Pressable
        onPress={(event) => {
          event.stopPropagation?.();
          download();
        }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Télécharger le PDF ${order.reference}`}
        style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
      >
        <Ionicons
          name={busy === 'download' ? 'hourglass-outline' : 'download-outline'}
          size={18}
          color={colors.primary}
        />
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, isDesktop ? styles.rowDesktop : null]}>
      <Button
        label="Télécharger le PDF"
        icon="download-outline"
        onPress={download}
        loading={busy === 'download'}
        disabled={busy === 'print'}
        fullWidth={!isDesktop}
        haptic
        style={isDesktop ? styles.flex : undefined}
      />
      <Button
        label="Enregistrer / imprimer"
        variant="outline"
        icon="print-outline"
        onPress={print}
        loading={busy === 'print'}
        disabled={busy === 'download'}
        fullWidth={!isDesktop}
        style={isDesktop ? styles.flex : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  rowDesktop: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  pressed: { opacity: 0.7 },
});
