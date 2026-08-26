import { layout, spacing } from '@/theme';

import { useBreakpoint } from './useBreakpoint';

interface GridResult {
  columns: number;
  cardWidth: number;
  gap: number;
  contentWidth: number;
}

/**
 * Calcule la largeur des cartes : 2 colonnes sur téléphone, 3 sur tablette,
 * jusqu'à 5 sur grand écran d'ordinateur.
 */
export const useGrid = (minCardWidth = 168): GridResult => {
  const { width, isDesktop, screenPadding } = useBreakpoint();

  const contentWidth = Math.min(width, layout.maxContentWidth) - screenPadding * 2;
  const gap = spacing.md;
  const minWidth = isDesktop ? Math.max(minCardWidth, 200) : minCardWidth;
  const maxColumns = isDesktop ? 5 : 4;

  const columns = Math.max(2, Math.min(maxColumns, Math.floor((contentWidth + gap) / (minWidth + gap))));
  const cardWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns);

  return { columns, cardWidth, gap, contentWidth };
};
