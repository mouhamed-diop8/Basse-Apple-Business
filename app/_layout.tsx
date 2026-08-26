import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Toaster, WhatsAppFab } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { useFavoritesStore } from '@/store/favorites';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const restore = useAuthStore((state) => state.restore);
  const restoring = useAuthStore((state) => state.restoring);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const syncFavorites = useFavoritesStore((state) => state.syncWithUser);

  useEffect(() => {
    restore();
  }, [restore]);

  // Les favoris suivent le compte connecté : chargés à la connexion, vidés à la
  // déconnexion pour ne jamais exposer la liste d'un autre utilisateur.
  useEffect(() => {
    syncFavorites(userId);
  }, [userId, syncFavorites]);

  useEffect(() => {
    if (!restoring) SplashScreen.hideAsync().catch(() => undefined);
  }, [restoring]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />

        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.surfaceAlt },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="produit/[id]" />
          <Stack.Screen name="auth/connexion" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="auth/inscription" />
          {/* Le retour arrière est neutralisé : une commande confirmée ne doit pas
              ramener à l'écran de paiement. */}
          <Stack.Screen
            name="commande/confirmee/[reference]"
            options={{ animation: 'fade', gestureEnabled: false }}
          />
        </Stack>

        <Toaster />
        <WhatsAppFab />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
});
