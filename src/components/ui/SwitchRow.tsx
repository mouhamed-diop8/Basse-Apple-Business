import { StyleSheet, Switch, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { AppText } from './AppText';

interface SwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export const SwitchRow = ({ label, description, value, onChange, disabled }: SwitchRowProps) => (
  <View style={styles.row}>
    <View style={styles.body}>
      <AppText variant="bodyStrong">{label}</AppText>
      {description ? <AppText variant="caption">{description}</AppText> : null}
    </View>

    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      accessibilityLabel={label}
      trackColor={{ false: colors.borderStrong, true: colors.primary }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.borderStrong}
    />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 58,
  },
  body: { flex: 1, gap: 2 },
});
