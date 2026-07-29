import { ComponentProps } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

import { colors, typography } from '@/theme/tokens';

type TextVariant = keyof typeof typography;

interface AppTextProps extends ComponentProps<typeof Text> {
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function AppText({
  variant = 'body',
  color = colors.ink,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...props}
      style={[typography[variant], { color }, style]}
    />
  );
}
