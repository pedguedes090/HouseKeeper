import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';

interface CardProps extends PropsWithChildren {
  tone?: 'surface' | 'soft' | 'success' | 'warning' | 'danger';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const toneColors = {
  surface: colors.surface,
  soft: colors.primarySurface,
  success: colors.successSoft,
  warning: colors.warningSoft,
  danger: colors.dangerSoft,
};

export function Card({
  tone = 'surface',
  style,
  accessibilityLabel,
  children,
}: CardProps) {
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, { backgroundColor: toneColors[tone] }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
});
