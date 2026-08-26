/**
 * N’accepte que des chemins internes de l’app (`/profil`, `/admin`, …).
 * Refuse les URL absolues, les protocoles et les chemins protocol-relatifs
 * (`//evil.example`) qui serviraient d’open redirect après connexion.
 */
export const safeInternalPath = (value?: string | string[] | null): string | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || typeof raw !== 'string') return null;

  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }

  if (!path.startsWith('/')) return null;
  if (path.startsWith('//') || path.startsWith('/\\')) return null;
  if (path.includes('\\')) return null;
  if (path.includes('://')) return null;
  if (/[\s<>'"]/.test(path)) return null;

  return path;
};
