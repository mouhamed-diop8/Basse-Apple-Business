import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText, ConfirmDialog, EmptyState, ScreenHeader } from '@/components/ui';
import { NotificationKind } from '@/data/types';
import { useNotificationsStore } from '@/store/notifications';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';
import { formatRelative } from '@/utils/format';

const KIND_VISUALS: Record<
  NotificationKind,
  { icon: keyof typeof Ionicons.glyphMap; tint: string; bg: string }
> = {
  order_confirmed: { icon: 'receipt-outline', tint: colors.primary, bg: colors.primarySoft },
  status_change: { icon: 'cube-outline', tint: colors.primary, bg: colors.primarySoft },
  delivery: { icon: 'bicycle-outline', tint: colors.success, bg: colors.successSoft },
  promotion: { icon: 'pricetag-outline', tint: colors.danger, bg: colors.dangerSoft },
  new_product: { icon: 'sparkles-outline', tint: colors.warning, bg: colors.warningSoft },
  price_drop: { icon: 'trending-down-outline', tint: colors.success, bg: colors.successSoft },
};

export default function NotificationsScreen() {
  const router = useRouter();

  const items = useNotificationsStore((state) => state.items);
  const markRead = useNotificationsStore((state) => state.markRead);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);
  const remove = useNotificationsStore((state) => state.remove);
  const clear = useNotificationsStore((state) => state.clear);

  const [confirmClear, setConfirmClear] = useState(false);

  const unread = items.filter((item) => !item.read).length;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} non lue(s)` : undefined}
        withStatusBar
        right={
          items.length > 0 ? (
            <View style={styles.headerActions}>
              {unread > 0 ? (
                <Pressable
                  onPress={() => {
                    markAllRead();
                    toast.info('Toutes les notifications sont marquées comme lues.');
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Tout marquer comme lu"
                >
                  <Ionicons name="checkmark-done-outline" size={21} color={colors.ink} />
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => setConfirmClear(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Tout effacer"
              >
                <Ionicons name="trash-outline" size={19} color={colors.danger} />
              </Pressable>
            </View>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title="Aucune notification"
          message="Vous serez informé ici de la confirmation de vos commandes, des étapes de livraison et des promotions."
          actionLabel="Voir les promotions"
          onAction={() => router.push('/catalogue?promo=1')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => {
            const visual = KIND_VISUALS[item.kind];

            return (
              <View style={[styles.card, item.read ? null : styles.cardUnread]}>
                <Pressable
                  onPress={() => {
                    markRead(item.id);
                    if (item.target) router.push(item.target as never);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  style={({ pressed }) => [styles.cardMain, pressed ? styles.pressed : null]}
                >
                  <View style={[styles.icon, { backgroundColor: visual.bg }]}>
                    <Ionicons name={visual.icon} size={19} color={visual.tint} />
                  </View>

                  <View style={styles.body}>
                    <View style={styles.titleRow}>
                      <AppText variant="captionStrong" style={styles.flex} numberOfLines={2}>
                        {item.title}
                      </AppText>
                      {item.read ? null : <View style={styles.dot} />}
                    </View>

                    <AppText variant="caption" numberOfLines={3}>
                      {item.body}
                    </AppText>

                    <AppText variant="micro" color={colors.mutedLight}>
                      {formatRelative(item.created_at)}
                    </AppText>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => remove(item.id)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Supprimer la notification"
                  style={styles.delete}
                >
                  <Ionicons name="close" size={17} color={colors.mutedLight} />
                </Pressable>
              </View>
            );
          }}
        />
      )}

      <ConfirmDialog
        visible={confirmClear}
        title="Effacer toutes les notifications ?"
        message="Cette action est définitive."
        confirmLabel="Effacer"
        destructive
        onConfirm={() => {
          clear();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingRight: spacing.sm },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.huge,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minWidth: 0,
  },
  delete: { paddingLeft: spacing.sm, paddingTop: 2 },
  cardUnread: { borderColor: colors.primary, backgroundColor: colors.white },
  pressed: { backgroundColor: colors.surfaceAlt },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
});
