import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';
import { initials } from '@/utils/format';
import { AppText } from './AppText';

interface AvatarProps {
  firstName: string;
  lastName: string;
  uri?: string | null;
  size?: number;
}

export const Avatar = ({ firstName, lastName, uri, size = 56 }: AvatarProps) => {
  const style = { width: size, height: size, borderRadius: radius.pill };

  if (uri) {
    return <Image source={{ uri }} style={style} contentFit="cover" transition={200} />;
  }

  return (
    <View style={[styles.fallback, style]}>
      <AppText variant={size > 48 ? 'subheading' : 'captionStrong'} color={colors.white}>
        {initials(firstName || '?', lastName || '')}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
