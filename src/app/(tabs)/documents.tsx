import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DocumentCard } from '@/components/domain/document-card';
import { Button, IconButton } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/chip';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { colors, spacing } from '@/theme/tokens';

type Filter = 'ALL' | 'URGENT' | 'SAFE';

export default function DocumentsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('ALL');
  const query = useQuery({
    queryKey: queryKeys.documents,
    queryFn: housekeeperApi.listDocuments,
  });
  const documents = useMemo(() => {
    if (!query.data) return [];
    if (filter === 'URGENT') {
      return query.data.filter((item) =>
        ['EXPIRED', 'CRITICAL', 'WARNING'].includes(item.urgency),
      );
    }
    if (filter === 'SAFE') {
      return query.data.filter((item) => ['SAFE', 'NO_EXPIRY'].includes(item.urgency));
    }
    return query.data;
  }, [filter, query.data]);

  return (
    <Screen
      header={
        <AppHeader
          title="Giấy tờ"
          right={
            <IconButton
              icon="search-outline"
              label="Tìm giấy tờ"
              color={colors.inkMuted}
            />
          }
        />
      }>
      <ChoiceChips
        value={filter}
        onChange={setFilter}
        choices={[
          { value: 'ALL', label: `Tất cả ${query.data?.length ?? ''}` },
          { value: 'URGENT', label: 'Cần chú ý' },
          { value: 'SAFE', label: 'An toàn' },
        ]}
      />

      {query.isLoading ? (
        <View style={styles.list}>
          <Skeleton height={190} />
          <Skeleton height={190} />
        </View>
      ) : query.isError ? (
        <ErrorState
          message="Không thể tải danh sách giấy tờ."
          onRetry={() => query.refetch()}
        />
      ) : documents.length ? (
        <View style={styles.list}>
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onPress={() => router.push(`/documents/${document.id}`)}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="id-card-outline"
          title={filter === 'ALL' ? 'Chưa có giấy tờ' : 'Không có kết quả'}
          message={
            filter === 'ALL'
              ? 'Thêm căn cước, hộ chiếu hoặc giấy phép lái xe để được nhắc trước khi hết hạn.'
              : 'Không có giấy tờ phù hợp với bộ lọc này.'
          }
          actionLabel={filter === 'ALL' ? 'Thêm giấy tờ' : undefined}
          onAction={() => router.push('/documents/form')}
        />
      )}

      <Button
        label="Thêm giấy tờ"
        icon="add"
        fullWidth
        onPress={() => router.push('/documents/form')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
});
