import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Badge } from '@/components/ui';
import { STORE } from '@/data/constants';
import { colors, radius, shadow, spacing } from '@/theme';

interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  href: string;
}

/** Les 5 offres demandées à la section 4 du cahier des charges. */
const SLIDES: Slide[] = [
  {
    id: 'iphone',
    eyebrow: 'Nouveaux iPhone',
    title: 'iPhone 17 disponible',
    subtitle: STORE.tagline,
    icon: 'phone-portrait',
    gradient: ['#101014', '#2C2C33'],
    href: '/catalogue?categorie=iphone',
  },
  {
    id: 'laptops',
    eyebrow: 'Ordinateurs portables',
    title: "Jusqu'à 15 % de remise",
    subtitle: 'MacBook, Dell, HP et Lenovo en stock',
    icon: 'laptop-outline',
    gradient: ['#123A6B', '#0B5FFF'],
    href: '/catalogue?categorie=laptops',
  },
  {
    id: 'accessories',
    eyebrow: 'Accessoires',
    title: '-20 % avec ACCESSOIRES20',
    subtitle: 'Claviers, souris, hubs et chargeurs',
    icon: 'flash-outline',
    gradient: ['#20313D', '#3E5C6B'],
    href: '/catalogue?categorie=accessories',
  },
  {
    id: 'promos',
    eyebrow: 'Promotions',
    title: 'Offres du moment',
    subtitle: 'Les meilleures remises du catalogue',
    icon: 'pricetag-outline',
    gradient: ['#5A1F2B', '#8E2C3C'],
    href: '/catalogue?promo=1',
  },
  {
    id: 'office',
    eyebrow: 'Packs bureautiques',
    title: 'Équipez votre bureau',
    subtitle: 'Écrans, imprimantes, onduleurs et supports',
    icon: 'briefcase-outline',
    gradient: ['#1F3A2E', '#356B52'],
    href: '/catalogue?categorie=office',
  },
];

const AUTOPLAY_MS = 5200;

export const PromoCarousel = ({ width, height = 186 }: { width: number; height?: number }) => {
  const router = useRouter();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  // Défilement automatique, suspendu dès que l'utilisateur touche le carrousel.
  useEffect(() => {
    const timer = setInterval(() => {
      if (paused.current) return;

      setIndex((current) => {
        const next = (current + 1) % SLIDES.length;
        listRef.current?.scrollToOffset({ offset: next * width, animated: true });
        return next;
      });
    }, AUTOPLAY_MS);

    return () => clearInterval(timer);
  }, [width]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={width}
        decelerationRate="fast"
        onTouchStart={() => {
          paused.current = true;
        }}
        onMomentumScrollEnd={(event) => {
          paused.current = false;
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
        }}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.slide, shadow.md, { height }]}
            >
              <View style={styles.slideBody}>
                <Badge label={item.eyebrow} tone="dark" style={styles.eyebrow} />

                <AppText variant="title" color={colors.white}>
                  {item.title}
                </AppText>

                <AppText variant="caption" color="rgba(255,255,255,0.82)">
                  {item.subtitle}
                </AppText>

                <Pressable
                  onPress={() => router.push(item.href as never)}
                  accessibilityRole="button"
                  accessibilityLabel={`Découvrir : ${item.title}`}
                  style={({ pressed }) => [styles.cta, pressed ? { opacity: 0.85 } : null]}
                >
                  <AppText variant="captionStrong" color={colors.ink}>
                    Découvrir
                  </AppText>
                  <Ionicons name="arrow-forward" size={14} color={colors.ink} />
                </Pressable>
              </View>

              <Animated.View
                style={[
                  styles.watermark,
                  {
                    transform: [
                      {
                        translateY: float.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -10],
                        }),
                      },
                      {
                        rotate: float.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['-6deg', '4deg'],
                        }),
                      },
                    ],
                  },
                ]}
                pointerEvents="none"
              >
                <Ionicons name={item.icon} size={96} color="rgba(255,255,255,0.16)" />
              </Animated.View>
            </LinearGradient>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View
            key={slide.id}
            style={[styles.dot, i === index ? styles.dotActive : null]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  slide: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slideBody: { gap: spacing.sm, maxWidth: '78%' },
  eyebrow: { backgroundColor: 'rgba(255,255,255,0.18)' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  watermark: { position: 'absolute', right: -14, bottom: -18 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  dotActive: { width: 18, backgroundColor: colors.ink },
});
