import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const sanitizeUrl = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
};

const url = sanitizeUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

/**
 * Sans identifiants renseignés dans `.env`, l'application démarre sur le
 * backend de démonstration local. Aucun écran n'a besoin de le savoir.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase n’est pas configuré : renseignez le fichier .env.');
  }

  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Pas de détection d'URL : l'app mobile gère elle-même le routage.
        detectSessionInUrl: false,
      },
    });
  }

  return client;
};
