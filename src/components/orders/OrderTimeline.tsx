import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText, Badge } from '@/components/ui';
import {
  ORDER_FLOW,
  ORDER_STATUS_ICONS,
  ORDER_STATUS_LABELS,
} from '@/data/constants';
import { Order, OrderStatus } from '@/data/types';
import { colors, radius, spacing } from '@/theme';
import { formatDateTime } from '@/utils/format';

/** Couleur associée à un statut, réutilisée par les badges de la liste. */
export const statusTone = (status: OrderStatus): 'neutral' | 'primary' | 'success' | 'danger' =>
  status === 'cancelled'
    ? 'danger'
    : status === 'delivered'
      ? 'success'
      : status === 'received'
        ? 'neutral'
        : 'primary';

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <Badge
    label={ORDER_STATUS_LABELS[status]}
    tone={statusTone(status)}
    icon={ORDER_STATUS_ICONS[status] as never}
  />
);

/**
 * Timeline verticale des 7 statuts. Une commande annulée sort du parcours :
 * on affiche alors uniquement les étapes franchies puis l'annulation.
 */
export const OrderTimeline = ({ order }: { order: Order }) => {
  const cancelled = order.status === 'cancelled';

  const reachedIndex = cancelled
    ? Math.max(
        0,
        ...order.history
          .filter((event) => event.status !== 'cancelled')
          .map((event) => ORDER_FLOW.indexOf(event.status)),
      )
    : ORDER_FLOW.indexOf(order.status);

  const dateFor = (status: OrderStatus): string | null =>
    order.history.find((event) => event.status === status)?.date ?? null;

  const steps: { status: OrderStatus; done: boolean; current: boolean }[] = ORDER_FLOW.map(
    (status, index) => ({
      status,
      done: index <= reachedIndex,
      current: !cancelled && index === reachedIndex,
    }),
  );

  if (cancelled) {
    steps.push({ status: 'cancelled', done: true, current: true });
  }

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isCancelStep = step.status === 'cancelled';
        const tint = isCancelStep
          ? colors.danger
          : step.done
            ? colors.success
            : colors.mutedLight;

        const date = dateFor(step.status);

        return (
          <View key={step.status} style={styles.step}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  step.done ? { backgroundColor: tint, borderColor: tint } : null,
                  step.current ? styles.dotCurrent : null,
                ]}
              >
                <Ionicons
                  name={
                    (isCancelStep
                      ? 'close'
                      : step.done
                        ? 'checkmark'
                        : ORDER_STATUS_ICONS[step.status]) as never
                  }
                  size={step.done ? 13 : 12}
                  color={step.done ? colors.white : colors.mutedLight}
                />
              </View>

              {index < steps.length - 1 ? (
                <View
                  style={[
                    styles.line,
                    steps[index + 1].done ? { backgroundColor: colors.success } : null,
                    isCancelStep ? { backgroundColor: colors.dangerSoft } : null,
                  ]}
                />
              ) : null}
            </View>

            <View style={styles.stepBody}>
              <AppText
                variant={step.current ? 'bodyStrong' : 'caption'}
                color={
                  isCancelStep
                    ? colors.danger
                    : step.done
                      ? colors.ink
                      : colors.mutedLight
                }
              >
                {ORDER_STATUS_LABELS[step.status]}
              </AppText>

              {date ? (
                <AppText variant="micro" color={colors.muted}>
                  {formatDateTime(date)}
                </AppText>
              ) : step.done ? null : (
                <AppText variant="micro" color={colors.mutedLight}>
                  À venir
                </AppText>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 0 },
  step: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 26 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCurrent: { transform: [{ scale: 1.12 }] },
  line: { width: 2, flex: 1, minHeight: 26, backgroundColor: colors.border },
  stepBody: { flex: 1, paddingBottom: spacing.lg, gap: 1 },
});
