import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { StatusBadge, urgencyTone } from '@/components/ui/status-badge';
import { documentTypeLabels, formatDate, urgencyLabels } from '@/lib/format';
import { DocumentRecord } from '@/lib/types';
import { colors, radii, spacing } from '@/theme/tokens';

const iconByType: Record<DocumentRecord['type'], keyof typeof Ionicons.glyphMap> = {
  NATIONAL_ID: 'id-card-outline',
  PASSPORT: 'book-outline',
  DRIVER_LICENSE: 'car-outline',
  INSURANCE: 'shield-checkmark-outline',
  VEHICLE_REGISTRATION: 'document-text-outline',
  OTHER: 'document-outline',
};

export function DocumentCard({
  document,
  onPress,
}: {
  document: DocumentRecord;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${document.title}, ${urgencyLabels[document.urgency]}`}
      onPress={onPress}>
      {({ pressed }) => (
        <Card
          tone={document.urgency === 'EXPIRED' ? 'danger' : 'surface'}
          style={[styles.card, pressed && styles.pressed]}>
          <View style={styles.topRow}>
            <View style={styles.icon}>
              <Ionicons
                name={iconByType[document.type]}
                size={22}
                color={colors.primary}
              />
            </View>
            <StatusBadge
              label={urgencyLabels[document.urgency]}
              tone={urgencyTone(document.urgency)}
            />
          </View>
          <View style={styles.copy}>
            <AppText variant="title">{document.title}</AppText>
            <AppText variant="supporting" color={colors.inkMuted}>
              {documentTypeLabels[document.type]}
              {document.documentNumber ? ` · ${document.documentNumber}` : ''}
            </AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.metaRow}>
            <View>
              <AppText variant="label" color={colors.inkMuted}>
                Ngày hết hạn
              </AppText>
              <AppText
                variant="supportingStrong"
                color={
                  ['EXPIRED', 'CRITICAL'].includes(document.urgency)
                    ? colors.danger
                    : colors.ink
                }>
                {formatDate(document.expirationDate)}
              </AppText>
            </View>
            <View style={styles.remaining}>
              <AppText variant="label" color={colors.inkMuted}>
                Thời gian còn lại
              </AppText>
              <AppText variant="supportingStrong" color={colors.primary}>
                {document.daysRemaining == null
                  ? 'Không giới hạn'
                  : document.daysRemaining < 0
                    ? `Quá ${Math.abs(document.daysRemaining)} ngày`
                    : `${document.daysRemaining} ngày`}
              </AppText>
            </View>
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.78,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  copy: {
    gap: spacing.xs,
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    opacity: 0.6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  remaining: {
    alignItems: 'flex-end',
  },
});
