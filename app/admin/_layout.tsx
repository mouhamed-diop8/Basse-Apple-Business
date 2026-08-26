import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';

import { EmptyState, LoadingState } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { colors } from '@/theme';

/**
 * Garde d'accès de l'espace administrateur (section 23). Le contrôle affiché
 * ici est un confort d'interface : la véritable barrière est appliquée par les
 * politiques RLS de Supabase, qui refusent toute écriture non administrateur.
 */
export default function AdminLayout() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const restoring = useAuthStore((state) => state.restoring);

  if (restoring) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, justifyContent: 'center' }}>
        <LoadingState label="Vérification de vos droits…" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, justifyContent: 'center' }}>
        <EmptyState
          icon="lock-closed-outline"
          title="Connexion requise"
          message="L’espace administrateur est réservé aux comptes autorisés."
          actionLabel="Se connecter"
          onAction={() => router.replace('/auth/connexion?redirect=/admin')}
          secondaryActionLabel="Retour à la boutique"
          onSecondaryAction={() => router.replace('/')}
        />
      </View>
    );
  }

  if (user.role !== 'admin') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, justifyContent: 'center' }}>
        <EmptyState
          icon="hand-left-outline"
          tone="danger"
          title="Accès refusé"
          message="Votre compte ne dispose pas des droits d’administration."
          actionLabel="Retour à la boutique"
          onAction={() => router.replace('/')}
        />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
