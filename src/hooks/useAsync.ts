import { useCallback, useEffect, useRef, useState } from 'react';

import { RepositoryError } from '@/data/repository';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Rejoue la requête. Utilisé par les boutons « Réessayer » et le pull-to-refresh. */
  reload: () => Promise<void>;
  refreshing: boolean;
  setData: (value: T | null) => void;
}

/**
 * Chargement de données avec états explicites. Le cahier des charges impose de
 * couvrir chargement, erreur réseau et vide (section 32) : ce hook fournit les
 * trois de façon homogène à tous les écrans.
 */
export const useAsync = <T,>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  options: { immediate?: boolean } = {},
): AsyncState<T> => {
  const { immediate = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const result = await loaderRef.current();
      if (mounted.current) setData(result);
    } catch (caught) {
      if (!mounted.current) return;

      setError(
        caught instanceof RepositoryError
          ? caught.message
          : 'Impossible de charger ces informations. Vérifiez votre connexion.',
      );
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (immediate) run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    loading,
    error,
    refreshing,
    reload: useCallback(() => run(true), [run]),
    setData,
  };
};
