import { useWindowDimensions } from 'react-native';

import { layout } from '@/theme';

/**
 * Points de rupture partagés. Toute adaptation mobile / tablette / ordinateur
 * passe par ici pour rester cohérente d'un écran à l'autre.
 */
export const useBreakpoint = () => {
  const { width, height } = useWindowDimensions();

  const isCompact = width < layout.breakpoints.tablet;
  const isTablet = width >= layout.breakpoints.tablet && width < layout.breakpoints.desktop;
  const isDesktop = width >= layout.breakpoints.desktop;
  const screenPadding = isDesktop ? layout.screenPaddingDesktop : layout.screenPadding;
  const contentWidth = Math.min(width, layout.maxContentWidth);

  const contentStyle = {
    width: '100%' as const,
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center' as const,
    padding: screenPadding,
  };

  return {
    width,
    height,
    isCompact,
    isTablet,
    isDesktop,
    screenPadding,
    contentWidth,
    contentStyle,
  };
};
