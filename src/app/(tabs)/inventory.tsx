import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AssetCard } from '@/components/domain/asset-card';
import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/chip';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { spacing } from '@/theme/tokens';

type Filter = 'ALL' | 'WARRANTY' | 'EXPIRED';

export default function AssetsScreen() {
  return (
    <Screen header={<AppHeader title="Tài sản & Bảo hành" />}>
      <InventoryContent />
    </Screen>
  );
}

export function InventoryContent() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('ALL');
  const query = useQuery({ queryKey: queryKeys.assets, queryFn: housekeeperApi.listAssets });
  const assets = useMemo(() => {
    if (!query.data) return [];
    if (filter === 'WARRANTY') {
      return query.data.filter((item) => ['VALID', 'ENDING_SOON'].includes(item.warrantyStatus));
    }
    if (filter === 'EXPIRED') {
      return query.data.filter((item) => item.warrantyStatus === 'EXPIRED');
    }
    return query.data;
  }, [filter, query.data]);

  return (
    <>
      <ChoiceChips
        value={filter}
        onChange={setFilter}
        choices={[
          { value: 'ALL', label: `Tất cả ${query.data?.length ?? ''}` },
          { value: 'WARRANTY', label: 'Còn bảo hành' },
          { value: 'EXPIRED', label: 'Hết bảo hành' },
        ]}
      />
      {query.isLoading ? (
        <View style={styles.list}>
          <Skeleton height={230} />
          <Skeleton height={230} />
        </View>
      ) : query.isError ? (
        <ErrorState
          message="Không thể tải danh sách tài sản."
          onRetry={() => query.refetch()}
        />
      ) : assets.length ? (
        <View style={styles.list}>
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onPress={() =>
                router.push({ pathname: '/property/[id]', params: { id: asset.id } })
              }
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="cube-outline"
          title={filter === 'ALL' ? 'Chưa có tài sản' : 'Không có kết quả'}
          message={
            filter === 'ALL'
              ? 'Lưu điện thoại, laptop hoặc thiết bị gia dụng để theo dõi bảo hành và bảo dưỡng.'
              : 'Không có tài sản phù hợp với bộ lọc này.'
          }
          actionLabel={filter === 'ALL' ? 'Thêm tài sản' : undefined}
          onAction={() => router.push('/property/form')}
        />
      )}
      <Button
        label="Thêm tài sản"
        icon="add"
        fullWidth
        onPress={() => router.push('/property/form')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.lg,
  },
});
