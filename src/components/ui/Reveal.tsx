import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';

import { motion } from '@/theme';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  style?: ViewStyle;
}

/**
 * Apparition douce : opacité + léger glissement vers le haut.
 * Utilisée sur l’accueil et l’écran de confirmation.
 */
export const Reveal = ({ children, delay = 0, style }: RevealProps) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.enter,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, progress]);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};
