import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Avatar, Button, Card, ConfirmDialog, Divider, ListRow } from '@/components/ui';
import { db } from '@/data';
import { STORE } from '@/data/constants';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAuthStore } from '@/store/auth';
import { useFavoritesStore } from '@/store/favorites';
import { useNotificationsStore, useUnreadCount } from '@/store/notifications';
import { toast } from '@/store/toast';
import { colors, layout, radius, spacing } from '@/theme';
import { formatDate } from '@/utils/format';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { screenPadding } = useBreakpoint();

  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const favoritesCount = useFavoritesStore((state) => state.ids.length);
  const syncFavorites = useFavoritesStore((state) => state.syncWithUser);
  const unread = useUnreadCount();
  const clearNotifications = useNotificationsStore((state) => state.clear);

  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    await syncFavorites(null);
    clearNotifications();
    setConfirmSignOut(false);
    toast.info('Vous êtes déconnecté.');
    router.replace('/');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { padding: screenPadding, paddingTop: insets.top + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {user ? (
          <Card style={styles.identityCard}>
            <Avatar
              firstName={user.first_name}
              lastName={user.last_name}
              uri={user.avatar_url}
              size={64}
            />

            <View style={styles.identityBody}>
              <AppText variant="heading">
                {user.first_name} {user.last_name}
              </AppText>
              <AppText variant="caption">{user.email}</AppText>
              <AppText variant="micro" color={colors.muted}>
                Client depuis {formatDate(user.created_at)}
              </AppText>
            </View>

            <Pressable
              onPress={() => router.push('/profil/informations')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Modifier mon profil"
              style={({ pressed }) => [styles.editButton, pressed ? styles.pressed : null]}
            >
              <Ionicons name="create-outline" size={19} color={colors.ink} />
            </Pressable>
          </Card>
        ) : (
          <Card style={styles.guestCard}>
            <View style={styles.guestIcon}>
              <Ionicons name="person-outline" size={26} color={colors.white} />
            </View>

            <AppText variant="subheading" center>
              Bienvenue sur {STORE.name}
            </AppText>

            <AppText variant="caption" center style={styles.guestText}>
              Connectez-vous pour suivre vos commandes, enregistrer vos favoris et vos adresses.
            </AppText>

            <View style={styles.guestActions}>
              <Button
                label="Se connecter"
                onPress={() => router.push('/auth/connexion')}
                fullWidth
              />
              <Button
                label="Créer un compte"
                variant="outline"
                onPress={() => router.push('/auth/inscription')}
                fullWidth
              />
            </View>
          </Card>
        )}

        {user?.role === 'admin' ? (
          <Card padded={false}>
            <ListRow
              icon="shield-checkmark-outline"
              iconColor={colors.primary}
              label="Espace administrateur"
              description="Tableau de bord, produits, stock, commandes et clients"
              onPress={() => router.push('/admin')}
            />
          </Card>
        ) : null}

        <View style={styles.group}>
          <AppText variant="micro" color={colors.muted} style={styles.groupLabel}>
            MON COMPTE
          </AppText>

          <Card padded={false}>
            <ListRow
              icon="receipt-outline"
              label="Mes commandes"
              description="Historique et suivi de livraison"
              onPress={() => router.push('/commandes')}
            />
            <Divider />
            <ListRow
              icon="heart-outline"
              label="Mes favoris"
              description="Produits enregistrés"
              value={favoritesCount > 0 ? String(favoritesCount) : undefined}
              onPress={() => router.push('/favoris')}
            />
            <Divider />
            <ListRow
              icon="location-outline"
              label="Mes adresses"
              description="Adresses de livraison enregistrées"
              onPress={() => router.push('/profil/adresses')}
            />
            <Divider />
            <ListRow
              icon="notifications-outline"
              label="Notifications"
              description="Commandes, promotions et nouveautés"
              badge={unread}
              onPress={() => router.push('/notifications')}
            />
          </Card>
        </View>

        <View style={styles.group}>
          <AppText variant="micro" color={colors.muted} style={styles.groupLabel}>
            AIDE ET RÉGLAGES
          </AppText>

          <Card padded={false}>
            <ListRow
              icon="chatbubble-ellipses-outline"
              label="Nous contacter"
              description="WhatsApp, téléphone, email et points de vente"
              onPress={() => router.push('/contact')}
            />
            <Divider />
            <ListRow
              icon="settings-outline"
              label="Paramètres"
              description="Notifications, confidentialité et informations légales"
              onPress={() => router.push('/parametres')}
            />
          </Card>
        </View>

        {user ? (
          <Card padded={false}>
            <ListRow
              icon="log-out-outline"
              label="Se déconnecter"
              destructive
              onPress={() => setConfirmSignOut(true)}
            />
          </Card>
        ) : null}

        <View style={styles.version}>
          <AppText variant="micro" color={colors.mutedLight} center>
            {STORE.name} · version 1.0.0
          </AppText>
          <AppText variant="micro" color={colors.mutedLight} center>
            Données : {db.mode === 'demo' ? 'mode démonstration local' : 'Supabase'}
          </AppText>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmSignOut}
        title="Se déconnecter"
        message="Vos favoris enregistrés hors ligne resteront disponibles sur cet appareil."
        confirmLabel="Se déconnecter"
        destructive
        onConfirm={handleSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: {
    paddingBottom: spacing.huge,
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityBody: { flex: 1, gap: 2 },
  editButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  guestCard: { alignItems: 'center', gap: spacing.md },
  guestIcon: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestText: { maxWidth: 300 },
  guestActions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xs },
  group: { gap: spacing.sm },
  groupLabel: { marginLeft: spacing.md, letterSpacing: 0.6 },
  version: { gap: 2, marginTop: spacing.sm },
});
