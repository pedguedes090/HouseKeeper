import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, layout, radii, spacing } from '@/theme/tokens';

export interface Choice<T extends string> {
  label: string;
  value: T;
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.primarySoft,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <AppText
        variant="label"
        color={selected ? colors.white : colors.inkMuted}
        numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ChoiceChips<T extends string>({
  choices,
  value,
  onChange,
  accessibilityLabel,
}: {
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  return (
    <View accessibilityLabel={accessibilityLabel}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {choices.map((choice) => (
          <Chip
            key={choice.value}
            label={choice.label}
            selected={choice.value === value}
            onPress={() => onChange(choice.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.page,
  },
});
