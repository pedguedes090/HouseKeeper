import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { ChoiceChips } from '@/components/ui/chip';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { DocumentsContent } from '@/app/(tabs)/documents';
import { InventoryContent } from '@/app/(tabs)/inventory';

type Segment = 'documents' | 'assets';

export default function StorageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ segment?: string }>();
  const initial: Segment = params.segment === 'assets' ? 'assets' : 'documents';
  const [segment, setSegment] = useState<Segment>(initial);

  function changeSegment(next: Segment) {
    setSegment(next);
    router.setParams({ segment: next });
  }

  return (
    <Screen header={<AppHeader title="Kho gia đình" />}>
      <ChoiceChips
        accessibilityLabel="Chọn nội dung trong kho"
        value={segment}
        onChange={changeSegment}
        choices={[
          { value: 'documents', label: 'Giấy tờ' },
          { value: 'assets', label: 'Tài sản & bảo hành' },
        ]}
      />
      {segment === 'documents' ? <DocumentsContent /> : <InventoryContent />}
    </Screen>
  );
}
