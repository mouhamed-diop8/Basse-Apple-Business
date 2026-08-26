import { isSupabaseConfigured } from '@/lib/supabase';
import { LocalRepository } from './providers/local';
import { SupabaseRepository } from './providers/supabase';
import { Repository } from './repository';

/**
 * Point d'entrée unique des données. Le backend est choisi une seule fois au
 * démarrage : si `.env` contient les identifiants Supabase, l'application les
 * utilise ; sinon elle tourne sur le jeu de démonstration local.
 */
export const db: Repository = isSupabaseConfigured
  ? new SupabaseRepository()
  : new LocalRepository();

export const isDemoMode = db.mode === 'demo';

/** Accès typé au backend local, pour les actions propres au mode démonstration. */
export const asLocalRepository = (): LocalRepository | null =>
  db instanceof LocalRepository ? db : null;

export const asSupabaseRepository = (): SupabaseRepository | null =>
  db instanceof SupabaseRepository ? db : null;

export * from './constants';
export * from './repository';
export * from './types';
