import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';
import { AppText } from './AppText';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Affiche le bouton œil et masque la saisie. */
  password?: boolean;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export const Input = ({
  label,
  error,
  hint,
  icon,
  password = false,
  containerStyle,
  required = false,
  style,
  onFocus,
  onBlur,
  ...rest
}: InputProps) => {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(password);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <AppText variant="captionStrong" style={styles.label}>
          {label}
          {required ? <AppText variant="captionStrong" color={colors.danger}> *</AppText> : null}
        </AppText>
      ) : null}

      <View
        style={[
          styles.field,
          { borderColor, backgroundColor: focused ? colors.white : colors.surfaceAlt },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.muted} /> : null}

        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.mutedLight}
          secureTextEntry={hidden}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          accessibilityLabel={label}
          {...rest}
        />

        {password ? (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Afficher le mot de passe' : 'Masquer le mot de passe'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.messageRow}>
          <Ionicons name="alert-circle" size={13} color={colors.danger} />
          <AppText variant="micro" color={colors.danger}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="micro" color={colors.muted} style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { marginLeft: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.ink,
    paddingVertical: spacing.md,
  },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: spacing.xs },
  hint: { marginLeft: spacing.xs },
});
