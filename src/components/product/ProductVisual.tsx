import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';
import { categoryIcon, visualGradient } from '@/utils/visuals';

interface ProductVisualProps {
  /** URL de la photo si elle existe, sinon un visuel est généré. */
  uri?: string;
  productId: string;
  categoryId: string;
  size?: number;
  /** Variante du dégradé : permet de différencier les vues d'une galerie. */
  index?: number;
  rounded?: number;
  style?: ViewStyle;
}

/**
 * Affiche la photo du produit, ou un visuel généré localement si aucune URL
 * n’est renseignée.
 */
export const ProductVisual = ({
  uri,
  productId,
  categoryId,
  size,
  index = 0,
  rounded = radius.md,
  style,
}: ProductVisualProps) => {
  const box: ViewStyle = {
    width: size ?? '100%',
    height: size ?? '100%',
    borderRadius: rounded,
    overflow: 'hidden',
  };

  if (uri) {
    return (
      <View style={[box, style, styles.photo]}>
        <Image
          source={{ uri }}
          style={styles.fill}
          contentFit="cover"
          transition={220}
          cachePolicy="memory-disk"
        />
      </View>
    );
  }

  const gradient = visualGradient(productId, index);
  const iconSize = size ? Math.round(size * 0.34) : 56;

  return (
    <View style={[box, style]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.fill}
      >
        <Ionicons
          name={categoryIcon(categoryId)}
          size={iconSize}
          color={colors.mutedLight}
          // Léger décalage entre les vues de galerie pour suggérer un autre angle.
          style={{ transform: [{ rotate: `${index * 6 - 6}deg` }] }}
        />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photo: { backgroundColor: colors.surfaceSunken },
});
