import { ReactNode } from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

import { colors, typography } from '@/theme';

type Variant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
  children?: ReactNode;
}

/**
 * Tout le texte de l'application passe par ce composant : cela garantit une
 * échelle typographique unique et évite les tailles arbitraires.
 */
export const AppText = ({
  variant = 'body',
  color,
  center,
  style,
  children,
  ...rest
}: AppTextProps) => {
  const composed: StyleProp<TextStyle> = [
    typography[variant],
    color ? { color } : null,
    center ? { textAlign: 'center' } : null,
    style,
  ];

  return (
    <Text style={composed} {...rest}>
      {children}
    </Text>
  );
};

export const Muted = ({ children, ...rest }: AppTextProps) => (
  <AppText variant="caption" color={colors.muted} {...rest}>
    {children}
  </AppText>
);
