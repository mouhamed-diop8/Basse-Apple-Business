import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * Palette volontairement restreinte : blanc, noir, gris clair et une seule
 * couleur d'accent. Toute couleur ajoutée ici doit servir un état (succès,
 * erreur, avertissement) et jamais une décoration.
 */
export const colors = {
  white: '#FFFFFF',
  black: '#0A0A0A',

  ink: '#0A0A0A',
  inkSoft: '#3C3C43',
  muted: '#8A8A8E',
  mutedLight: '#AEAEB2',

  surface: '#FFFFFF',
  surfaceAlt: '#F7F7F9',
  surfaceSunken: '#F2F2F5',
  border: '#E8E8EC',
  borderStrong: '#D8D8DE',

  primary: '#0B5FFF',
  primaryDark: '#0847C4',
  primarySoft: '#EAF1FF',

  success: '#1B9E5A',
  successSoft: '#E6F6ED',
  warning: '#C77700',
  warningSoft: '#FFF4E0',
  danger: '#D92D20',
  dangerSoft: '#FDECEA',

  star: '#F5A524',
  overlay: 'rgba(10,10,10,0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 44,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const fontSize = {
  xxs: 10,
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
} as const;

type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'captionStrong'
  | 'micro';

export const typography: Record<TextVariant, TextStyle> = {
  display: { fontSize: fontSize.display, fontWeight: '800', letterSpacing: -0.8, color: colors.ink },
  title: { fontSize: fontSize.xxl, fontWeight: '700', letterSpacing: -0.5, color: colors.ink },
  heading: { fontSize: fontSize.xl, fontWeight: '700', letterSpacing: -0.3, color: colors.ink },
  subheading: { fontSize: fontSize.lg, fontWeight: '600', letterSpacing: -0.2, color: colors.ink },
  body: { fontSize: fontSize.md, fontWeight: '400', color: colors.inkSoft },
  bodyStrong: { fontSize: fontSize.md, fontWeight: '600', color: colors.ink },
  caption: { fontSize: fontSize.sm, fontWeight: '400', color: colors.muted },
  captionStrong: { fontSize: fontSize.sm, fontWeight: '600', color: colors.ink },
  micro: { fontSize: fontSize.xs, fontWeight: '600', color: colors.muted },
};

/**
 * Ombres discrètes. Sur Android on garde une élévation basse : les ombres
 * larges y sont rendues plus durement que sur iOS.
 */
const makeShadow = (
  y: number,
  blur: number,
  opacity: number,
  elevation: number,
): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur,
    },
    android: { elevation },
    default: {
      boxShadow: `0 ${y}px ${blur}px rgba(10,10,10,${opacity})`,
    } as ViewStyle,
  })!;

export const shadow = {
  none: {} as ViewStyle,
  xs: makeShadow(1, 3, 0.05, 1),
  sm: makeShadow(2, 8, 0.06, 2),
  md: makeShadow(6, 16, 0.08, 4),
  lg: makeShadow(12, 28, 0.12, 8),
};

/** Durées d’animation partagées : entrées de page, carrousels, succès. */
export const motion = {
  fast: 180,
  base: 320,
  slow: 560,
  enter: 640,
} as const;

export const layout = {
  screenPadding: spacing.lg,
  screenPaddingDesktop: spacing.xxxl,
  tabBarHeight: 60,
  headerHeight: 56,
  cardImageRatio: 1,
  /** Largeur max du contenu : assez large pour un ordinateur, encore lisible. */
  maxContentWidth: 1180,
  breakpoints: {
    tablet: 768,
    desktop: 1024,
  },
} as const;

export const theme = { colors, spacing, radius, fontSize, typography, shadow, layout, motion };

export type Theme = typeof theme;
