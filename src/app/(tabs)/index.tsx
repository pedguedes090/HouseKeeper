import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AssetCard } from '@/components/domain/asset-card';
import { BillCard } from '@/components/domain/bill-card';
import { DocumentCard } from '@/components/domain/document-card';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { AppHeader, SectionHeader } from '@/components/ui/header';
import { IconButton } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { formatCurrency, greeting } from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

const quickActions = [
  { label: 'Quét tài liệu', icon: 'scan-outline', href: '/(tabs)/scan' },
  { label: 'Thêm giấy tờ', icon: 'id-card-outline', href: '/documents/form' },
  { label: 'Thêm hóa đơn', icon: 'receipt-outline', href: '/bills/form' },
  { label: 'Hỏi trợ lý', icon: 'sparkles-outline', href: '/assistant' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const dashboard = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: housekeeperApi.dashboard,
  });

  return (
    <Screen
      header={
        <AppHeader
          greeting={greeting()}
          displayName={user?.displayName ?? 'Bạn'}
          onAvatarPress={() => router.push('/settings')}
          right={
            <IconButton
              icon="notifications-outline"
              label="Thông báo"
              onPress={() => router.push('/notifications')}
            />
          }
        />
      }>
      <LinearGradient
        colors={[colors.primary, colors.primaryBright]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <AppText variant="label" color="rgba(255,255,255,0.78)">
              TỔNG QUAN HÔM NAY
            </AppText>
            <AppText variant="headline" color={colors.white}>
              Mọi việc quan trọng,{'\n'}trong tầm kiểm soát.
            </AppText>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={28} color={colors.white} />
          </View>
        </View>
        {dashboard.isLoading ? (
          <Skeleton height={70} />
        ) : dashboard.data ? (
          <View style={styles.summaryRow}>
            <SummaryMetric value={dashboard.data.urgentDocumentCount} label="Giấy tờ gấp" />
            <View style={styles.summaryDivider} />
            <SummaryMetric value={dashboard.data.unpaidBillCount} label="Khoản cần trả" />
            <View style={styles.summaryDivider} />
            <SummaryMetric value={dashboard.data.expiringWarrantyCount} label="Sắp hết BH" />
          </View>
        ) : null}
      </LinearGradient>

      <View style={styles.quickGrid}>
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => router.push(action.href)}
            style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
            <View style={styles.quickIcon}>
              <Ionicons name={action.icon} size={23} color={colors.primary} />
            </View>
            <AppText variant="labelStrong" style={styles.quickLabel}>
              {action.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      {dashboard.isError ? (
        <ErrorState
          message="Không kết nối được máy chủ House Keeper."
          onRetry={() => dashboard.refetch()}
        />
      ) : dashboard.isLoading ? (
        <View style={styles.stack}>
          <Skeleton height={128} />
          <Skeleton height={112} />
          <Skeleton height={180} />
        </View>
      ) : dashboard.data ? (
        <>
          {Object.keys(dashboard.data.amountDueByCurrency).length > 0 ? (
            <Card tone="warning" style={styles.dueCard}>
              <View style={styles.dueIcon}>
                <Ionicons name="wallet-outline" size={24} color={colors.warning} />
              </View>
              <View style={styles.flex}>
                <AppText variant="supporting" color={colors.inkMuted}>
                  Cần thanh toán sắp tới
                </AppText>
                {Object.entries(dashboard.data.amountDueByCurrency).map(([currency, amount]) => (
                  <AppText key={currency} variant="title" color={colors.warning}>
                    {formatCurrency(amount, currency)}
                  </AppText>
                ))}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.warning} />
            </Card>
          ) : null}

          <View style={styles.section}>
            <SectionHeader
              title="Cần chú ý trước"
              actionLabel="Xem giấy tờ"
              onAction={() =>
                router.push('/(tabs)/storage?segment=documents')
              }
            />
            {dashboard.data.urgentDocuments[0] ? (
              <DocumentCard
                document={dashboard.data.urgentDocuments[0]}
                onPress={() => router.push(`/documents/${dashboard.data!.urgentDocuments[0].id}`)}
              />
            ) : (
              <CalmState message="Không có giấy tờ nào cần xử lý gấp." />
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="Khoản thanh toán sắp tới"
              actionLabel="Xem lịch"
              onAction={() => router.push('/(tabs)/calendar')}
            />
            {dashboard.data.upcomingBills.length ? (
              <View style={styles.stack}>
                {dashboard.data.upcomingBills.slice(0, 3).map((bill) => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    compact
                    onPress={() => router.push(`/bills/${bill.id}`)}
                  />
                ))}
              </View>
            ) : (
              <CalmState message="Chưa có khoản thanh toán sắp tới." />
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="Bảo hành sắp hết"
              actionLabel="Xem tài sản"
              onAction={() => router.push('/(tabs)/storage?segment=assets')}
            />
            {dashboard.data.expiringWarranties[0] ? (
              <AssetCard
                asset={dashboard.data.expiringWarranties[0]}
                onPress={() =>
                  router.push({
                    pathname: '/property/[id]',
                    params: { id: dashboard.data!.expiringWarranties[0].id },
                  })
                }
              />
            ) : (
              <CalmState message="Mọi tài sản đang trong trạng thái ổn định." />
            )}
          </View>
        </>
      ) : (
        <EmptyState
          title="Bắt đầu cùng House Keeper"
          message="Quét hóa đơn hoặc thêm giấy tờ đầu tiên để ứng dụng chủ động nhắc bạn."
          actionLabel="Quét tài liệu"
          onAction={() => router.push('/(tabs)/scan')}
        />
      )}
    </Screen>
  );
}

function SummaryMetric({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="headline" color={colors.white}>
        {value}
      </AppText>
      <AppText variant="label" color="rgba(255,255,255,0.76)" style={styles.metricLabel}>
        {label}
      </AppText>
    </View>
  );
}

function CalmState({ message }: { message: string }) {
  return (
    <Card tone="success" style={styles.calm}>
      <Ionicons name="checkmark-circle" size={22} color={colors.success} />
      <AppText variant="supporting" color={colors.success} style={styles.flex}>
        {message}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radii.lg,
    gap: spacing.xl,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  heroTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radii.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  summaryRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radii.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  summaryDivider: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    height: 38,
    width: 1,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    textAlign: 'center',
  },
  quickGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  quickIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  quickLabel: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.68,
    transform: [{ scale: 0.98 }],
  },
  dueCard: {
    alignItems: 'center',
    borderColor: colors.warningSoft,
    flexDirection: 'row',
    gap: spacing.md,
  },
  dueIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  flex: {
    flex: 1,
  },
  stack: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  calm: {
    alignItems: 'center',
    borderColor: colors.successSoft,
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
