import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, layout, radii, shadows, spacing } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  trailingIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const variantStyles: Record<
  ButtonVariant,
  { backgroundColor: string; borderColor: string; textColor: string }
> = {
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    textColor: colors.white,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    textColor: colors.primary,
  },
  ghost: {
    backgroundColor: colors.transparent,
    borderColor: colors.transparent,
    textColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    textColor: colors.white,
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  trailingIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  compact = false,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const palette = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      testID={testID}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : styles.regular,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: isDisabled ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        variant === 'primary' && shadows.action,
        fullWidth && styles.fullWidth,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 17 : 19} color={palette.textColor} /> : null}
          <AppText
            variant={compact ? 'labelStrong' : 'bodyMedium'}
            color={palette.textColor}
            numberOfLines={1}>
            {label}
          </AppText>
          {trailingIcon ? (
            <Ionicons name={trailingIcon} size={compact ? 17 : 19} color={palette.textColor} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color = colors.ink,
  backgroundColor = colors.transparent,
  children,
}: {
  icon?: IconName;
  label: string;
  onPress?: () => void;
  color?: string;
  backgroundColor?: string;
  children?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor, opacity: pressed ? 0.7 : 1 },
      ]}>
      {children ??
        (icon ? <Ionicons name={icon} size={22} color={color} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  regular: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  compact: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    width: layout.minTouchTarget,
  },
});
