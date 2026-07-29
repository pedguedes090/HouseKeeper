import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, spacing } from '@/theme/tokens';

export function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.last]}>
      <AppText variant="supporting" color={colors.inkMuted} style={styles.label}>
        {label}
      </AppText>
      <AppText variant="supportingStrong" style={styles.value}>
        {value || '—'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: spacing.md,
  },
  last: {
    borderBottomWidth: 0,
  },
  label: {
    flex: 1,
  },
  value: {
    flex: 1.35,
    textAlign: 'right',
  },
});
