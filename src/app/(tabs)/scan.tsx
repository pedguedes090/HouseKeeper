import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/chip';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { formatDateTime } from '@/lib/format';
import { housekeeperApi, queryKeys } from '@/lib/housekeeper-api';
import { PickedFile, ScanJob, ScanTargetType } from '@/lib/types';
import { colors, radii, spacing } from '@/theme/tokens';

const targets = [
  {
    value: 'BILL',
    label: 'Hóa đơn',
    title: 'Hóa đơn & khoản chi',
    description: 'Nhận diện nhà cung cấp, số tiền và ngày đến hạn.',
    icon: 'receipt-outline',
  },
  {
    value: 'DOCUMENT',
    label: 'Giấy tờ',
    title: 'Giấy tờ cá nhân',
    description: 'Nhận diện số giấy tờ, nơi cấp và ngày hết hạn.',
    icon: 'id-card-outline',
  },
  {
    value: 'ASSET',
    label: 'Tài sản',
    title: 'Tài sản & bảo hành',
    description: 'Nhận diện sản phẩm, giá mua và thời hạn bảo hành.',
    icon: 'cube-outline',
  },
] as const;

export default function ScanScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<ScanTargetType>('BILL');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const selected = targets.find((item) => item.value === target)!;
  const scans = useQuery({ queryKey: queryKeys.scans, queryFn: housekeeperApi.listScans });
  const upload = useMutation({
    mutationFn: (file: PickedFile) => housekeeperApi.uploadScan(target, file),
    onSuccess: (scan) => {
      setUploadError(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: queryKeys.scans });
      router.push(`/scan/review/${scan.id}`);
    },
    onError: (error: Error) => {
      setUploadError(error.message || 'Hãy kiểm tra kết nối và thử lại.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  function startUpload(file: PickedFile) {
    setUploadError(null);
    upload.mutate(file);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Cần quyền camera',
        'Cho phép House Keeper dùng camera để chụp tài liệu. Bạn vẫn có thể chọn ảnh từ thư viện.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      startUpload({
        uri: asset.uri,
        name: asset.fileName ?? `housekeeper-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsMultipleSelection: false,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      startUpload({
        uri: asset.uri,
        name: asset.fileName ?? `housekeeper-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    }
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      startUpload({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
      });
    }
  }

  return (
    <Screen header={<AppHeader title="Quét tài liệu" />}>
      <View style={styles.intro}>
        <AppText variant="headline">Bạn muốn lưu thông tin gì?</AppText>
        <AppText variant="supporting" color={colors.inkMuted}>
          Chọn đúng loại để AI đọc chính xác hơn. Bạn luôn được kiểm tra lại trước khi lưu.
        </AppText>
      </View>

      <ChoiceChips
        value={target}
        onChange={setTarget}
        accessibilityLabel="Loại tài liệu cần quét"
        choices={targets.map(({ value, label }) => ({ value, label }))}
      />

      <View style={styles.scannerFrame}>
        <ScannerMotion active={upload.isPending} />
        <View style={styles.cornerTopLeft} />
        <View style={styles.cornerTopRight} />
        <View style={styles.cornerBottomLeft} />
        <View style={styles.cornerBottomRight} />
        <View style={styles.scanIcon}>
          <Ionicons
            name={selected.icon}
            size={46}
            color={upload.isPending ? colors.inkMuted : colors.primary}
          />
        </View>
        <AppText variant="title" style={styles.centerText}>
          {upload.isPending ? 'AI đang đọc tài liệu…' : selected.title}
        </AppText>
        <AppText variant="supporting" color={colors.inkMuted} style={styles.centerText}>
          {upload.isPending
            ? 'Quá trình này có thể mất vài giây. Vui lòng giữ ứng dụng mở.'
            : selected.description}
        </AppText>
        <Button
          label={upload.isPending ? 'Đang phân tích' : 'Chụp ảnh'}
          icon="camera"
          loading={upload.isPending}
          disabled={upload.isPending}
          onPress={takePhoto}
        />
      </View>

      {uploadError ? (
        <View accessibilityLiveRegion="assertive" style={styles.uploadError}>
          <View style={styles.errorIcon}>
            <Ionicons name="cloud-offline-outline" size={21} color={colors.danger} />
          </View>
          <View style={styles.flex}>
            <AppText variant="supportingStrong" color={colors.danger}>
              Chưa thể phân tích ảnh
            </AppText>
            <AppText variant="label" color={colors.ink}>
              {uploadError}
            </AppText>
          </View>
          <Pressable
            accessibilityLabel="Đóng thông báo lỗi"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setUploadError(null)}
            style={styles.dismissError}>
            <Ionicons name="close" size={20} color={colors.danger} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.sourceRow}>
        <SourceButton
          icon="images-outline"
          label="Thư viện ảnh"
          disabled={upload.isPending}
          onPress={pickImage}
        />
        <SourceButton
          icon="document-attach-outline"
          label="Chọn tệp ảnh"
          disabled={upload.isPending}
          onPress={pickFile}
        />
      </View>

      <Card tone="soft" style={styles.privacy}>
        <Ionicons name="lock-closed-outline" size={22} color={colors.primary} />
        <View style={styles.flex}>
          <AppText variant="supportingStrong">Bạn là người quyết định</AppText>
          <AppText variant="label" color={colors.inkMuted}>
            AI chỉ gợi ý dữ liệu. Không thông tin nào được lưu chính thức trước khi bạn xác nhận.
          </AppText>
        </View>
      </Card>

      <View style={styles.history}>
        <AppText variant="title">Lần quét gần đây</AppText>
        {scans.isLoading ? (
          <>
            <Skeleton height={72} />
            <Skeleton height={72} />
          </>
        ) : scans.isError ? (
          <ErrorState
            message="Không thể tải lịch sử quét."
            onRetry={() => scans.refetch()}
          />
        ) : scans.data?.length ? (
          scans.data.slice(0, 5).map((scan) => (
            <ScanHistoryItem
              key={scan.id}
              scan={scan}
              onPress={() => router.push(`/scan/review/${scan.id}`)}
            />
          ))
        ) : (
          <AppText variant="supporting" color={colors.inkMuted}>
            Chưa có lần quét nào. Hãy thử với một ảnh rõ, đủ sáng và không bị cắt góc.
          </AppText>
        )}
      </View>
    </Screen>
  );
}

function ScannerMotion({ active }: { active: boolean }) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    if (!active) {
      progress.value = 0;
      return;
    }
    if (reducedMotion) {
      progress.value = 0.5;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, {
        duration: 1150,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [active, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: active ? (reducedMotion ? 0.42 : 0.72) : 0,
    transform: [{ translateY: progress.value * 218 }],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      pointerEvents="none"
      style={[styles.scanLine, animatedStyle]}
    />
  );
}

function SourceButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sourceButton,
        (pressed || disabled) && styles.faded,
      ]}>
      <Ionicons name={icon} size={23} color={colors.primary} />
      <AppText variant="labelStrong" color={colors.primary}>
        {label}
      </AppText>
    </Pressable>
  );
}

function ScanHistoryItem({ scan, onPress }: { scan: ScanJob; onPress: () => void }) {
  const status = {
    PROCESSING: { text: 'Đang xử lý', color: colors.primary, icon: 'time-outline' },
    REVIEW_REQUIRED: { text: 'Cần kiểm tra', color: colors.warning, icon: 'create-outline' },
    CONFIRMED: { text: 'Đã lưu', color: colors.success, icon: 'checkmark-circle-outline' },
    FAILED: { text: 'Thất bại', color: colors.danger, icon: 'alert-circle-outline' },
  }[scan.status] as {
    text: string;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${scan.originalFileName}, ${status.text}`}
      onPress={onPress}
      style={({ pressed }) => [styles.historyItem, pressed && styles.faded]}>
      <View style={styles.historyIcon}>
        <Ionicons name={status.icon} size={22} color={status.color} />
      </View>
      <View style={styles.flex}>
        <AppText variant="supportingStrong" numberOfLines={1}>
          {scan.originalFileName}
        </AppText>
        <AppText variant="label" color={colors.inkMuted}>
          {formatDateTime(scan.createdAt)}
        </AppText>
      </View>
      <AppText variant="labelStrong" color={status.color}>
        {status.text}
      </AppText>
    </Pressable>
  );
}

const corner = {
  borderColor: colors.primary,
  height: 28,
  position: 'absolute' as const,
  width: 28,
};

const styles = StyleSheet.create({
  intro: {
    gap: spacing.sm,
  },
  scannerFrame: {
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 330,
    padding: spacing.xl,
  },
  scanLine: {
    backgroundColor: colors.primaryBright,
    borderRadius: radii.pill,
    height: 2,
    left: spacing.section,
    position: 'absolute',
    right: spacing.section,
    top: 54,
  },
  scanIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  centerText: {
    textAlign: 'center',
  },
  cornerTopLeft: {
    ...corner,
    borderLeftWidth: 3,
    borderTopLeftRadius: radii.sm,
    borderTopWidth: 3,
    left: spacing.lg,
    top: spacing.lg,
  },
  cornerTopRight: {
    ...corner,
    borderRightWidth: 3,
    borderTopRightRadius: radii.sm,
    borderTopWidth: 3,
    right: spacing.lg,
    top: spacing.lg,
  },
  cornerBottomLeft: {
    ...corner,
    borderBottomLeftRadius: radii.sm,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: spacing.lg,
    left: spacing.lg,
  },
  cornerBottomRight: {
    ...corner,
    borderBottomRightRadius: radii.sm,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: spacing.lg,
    right: spacing.lg,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  uploadError: {
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  errorIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  dismissError: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sourceButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 82,
    padding: spacing.md,
  },
  faded: {
    opacity: 0.58,
  },
  privacy: {
    alignItems: 'flex-start',
    borderColor: colors.primarySoft,
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  history: {
    gap: spacing.md,
  },
  historyItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.md,
  },
  historyIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
