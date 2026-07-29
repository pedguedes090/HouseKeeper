import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/theme/tokens';

export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <AppText variant="supportingStrong">{label}</AppText>
        {description ? (
          <AppText variant="label" color={colors.inkMuted}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primarySoft }}
        thumbColor={value ? colors.primary : colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
    minHeight: 56,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
});
