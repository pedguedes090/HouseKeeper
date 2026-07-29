import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { StatusBadge, urgencyTone } from '@/components/ui/status-badge';
import {
  assetCategoryLabels,
  formatCurrency,
  formatDate,
  warrantyLabels,
} from '@/lib/format';
import { AssetRecord } from '@/lib/types';
import { colors, radii, spacing } from '@/theme/tokens';

const icons: Record<AssetRecord['category'], keyof typeof Ionicons.glyphMap> = {
  PHONE: 'phone-portrait-outline',
  LAPTOP: 'laptop-outline',
  TELEVISION: 'tv-outline',
  AIR_CONDITIONER: 'snow-outline',
  HOME_APPLIANCE: 'hardware-chip-outline',
  VEHICLE: 'car-sport-outline',
  OTHER: 'cube-outline',
};

export function AssetCard({
  asset,
  onPress,
}: {
  asset: AssetRecord;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${asset.name}, ${warrantyLabels[asset.warrantyStatus]}`}
      onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.card, pressed && styles.pressed]}>
          <View style={styles.identityRow}>
            <View style={styles.icon}>
              <Ionicons name={icons[asset.category]} size={30} color={colors.primary} />
            </View>
            <View style={styles.identity}>
              <View style={styles.titleRow}>
                <AppText variant="bodyMedium" style={styles.title} numberOfLines={2}>
                  {asset.name}
                </AppText>
                <StatusBadge
                  label={warrantyLabels[asset.warrantyStatus]}
                  tone={urgencyTone(asset.warrantyStatus)}
                />
              </View>
              <AppText variant="supporting" color={colors.inkMuted}>
                {asset.brand ?? assetCategoryLabels[asset.category]}
                {asset.model ? ` · ${asset.model}` : ''}
              </AppText>
              <AppText variant="label" color={colors.inkMuted}>
                Mua: {formatDate(asset.purchaseDate)}
              </AppText>
            </View>
          </View>
          <View style={styles.warranty}>
            <View>
              <AppText variant="label" color={colors.inkMuted}>
                Hết hạn bảo hành
              </AppText>
              <AppText
                variant="supportingStrong"
                color={
                  ['EXPIRED', 'ENDING_SOON'].includes(asset.warrantyStatus)
                    ? colors.danger
                    : colors.success
                }>
                {formatDate(asset.warrantyExpiresOn)}
              </AppText>
            </View>
            <View style={styles.price}>
              <AppText variant="label" color={colors.inkMuted}>
                Giá mua
              </AppText>
              <AppText variant="supportingStrong" color={colors.primary}>
                {formatCurrency(asset.purchasePrice, asset.currency)}
              </AppText>
            </View>
          </View>
          <View style={styles.linkRow}>
            <Ionicons name="build-outline" size={16} color={colors.primary} />
            <AppText variant="supportingStrong" color={colors.primary}>
              Lịch sử sửa chữa
            </AppText>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.inkMuted}
              style={styles.chevron}
            />
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  pressed: {
    opacity: 0.78,
  },
  identityRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  identity: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
  },
  warranty: {
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  price: {
    alignItems: 'flex-end',
  },
  linkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chevron: {
    marginLeft: 'auto',
  },
});
