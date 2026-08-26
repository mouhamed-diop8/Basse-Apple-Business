import { useEffect, useState } from 'react';

/** Retarde la propagation d'une valeur : évite une requête à chaque frappe. */
export const useDebounce = <T,>(value: T, delayMs = 280): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};
