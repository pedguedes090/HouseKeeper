/* eslint-disable react-hooks/immutability -- Reanimated shared values are mutable by design inside gesture worklets. */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  clamp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import {
  absoluteApiUrl,
  API_BASE_URL,
  apiFetch,
  getAccessToken,
  getApiErrorMessage,
} from '@/lib/api';
import { loadProtectedImageAsset } from '@/lib/protected-image-loader';
import { useAuth } from '@/providers/auth-provider';
import { colors, layout, radii, spacing } from '@/theme/tokens';

type ImageLoadState =
  | { status: 'loading'; uri: null; message: null }
  | { status: 'ready'; uri: string; message: null }
  | { status: 'error'; uri: null; message: string };

interface SecureImageViewerProps {
  uri: string | null | undefined;
  title?: string;
  contentType?: string | null;
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const DOWNLOAD_TIMEOUT_MS = 20_000;

export function SecureImageViewer({
  uri,
  title = 'Ảnh đính kèm',
  contentType,
  height = 230,
  style,
  testID,
}: SecureImageViewerProps) {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [attempt, setAttempt] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const imageRequestKey = `${uri ?? 'missing'}:${attempt}`;
  const [decodeFailureKey, setDecodeFailureKey] = useState<string | null>(null);
  const decodeFailed = decodeFailureKey === imageRequestKey;
  const loaded = useProtectedImage(uri, contentType, attempt, user?.id);
  const isPdf = contentType?.toLowerCase().includes('pdf');
  const loadState: ImageLoadState = decodeFailed
    ? {
        status: 'error',
        uri: null,
        message: 'Tệp đã tải về nhưng không đọc được như một ảnh.',
      }
    : loaded;

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  if (!uri) {
    return (
      <View style={[styles.unavailable, style]}>
        <Ionicons name="image-outline" size={24} color={colors.inkMuted} />
        <View style={styles.flex}>
          <AppText variant="supportingStrong">Chưa có ảnh đính kèm</AppText>
          <AppText variant="label" color={colors.inkMuted}>
            Ảnh sẽ xuất hiện ở đây sau khi bạn quét hoặc tải lên.
          </AppText>
        </View>
      </View>
    );
  }

  if (isPdf) {
    return (
      <View style={[styles.pdf, style]}>
        <View style={styles.pdfIcon}>
          <Ionicons name="document-text-outline" size={26} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="supportingStrong" numberOfLines={2}>
            {title}
          </AppText>
          <AppText variant="label" color={colors.inkMuted}>
            Tệp PDF đã được lưu an toàn cùng dữ liệu.
          </AppText>
        </View>
      </View>
    );
  }

  if (loadState.status === 'loading') {
    return (
      <View
        accessibilityLiveRegion="polite"
        style={[styles.frame, styles.loadingFrame, { height }, style]}
        testID={testID}>
        <ActivityIndicator size="small" color={colors.primary} />
        <AppText variant="supporting" color={colors.inkMuted}>
          Đang mở ảnh…
        </AppText>
      </View>
    );
  }

  if (loadState.status === 'error') {
    return (
      <View
        accessibilityLiveRegion="assertive"
        style={[styles.frame, styles.errorFrame, { height }, style]}
        testID={testID}>
        <View style={styles.errorIcon}>
          <Ionicons name="cloud-offline-outline" size={25} color={colors.danger} />
        </View>
        <AppText variant="supportingStrong">Chưa mở được ảnh</AppText>
        <AppText variant="label" color={colors.inkMuted} style={styles.centerText}>
          {loadState.message}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tải lại ảnh"
          onPress={retry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}>
          <Ionicons name="refresh" size={17} color={colors.primary} />
          <AppText variant="supportingStrong" color={colors.primary}>
            Thử lại
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem toàn màn hình ${title}`}
        accessibilityHint="Mở ảnh để phóng to và di chuyển"
        onPress={() => {
          void Haptics.selectionAsync();
          setViewerOpen(true);
        }}
        style={({ pressed }) => [
          styles.frame,
          { height },
          pressed && styles.imagePressed,
          style,
        ]}
        testID={testID}>
        <Image
          accessibilityLabel={title}
          source={{ uri: loadState.uri, cacheKey: imageRequestKey }}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={reduceMotion ? 0 : 180}
          onError={() => setDecodeFailureKey(imageRequestKey)}
          style={styles.image}
        />
        <View style={styles.expandBadge}>
          <Ionicons name="expand-outline" size={18} color={colors.white} />
        </View>
        <View style={styles.imageLabel}>
          <Ionicons name="image-outline" size={16} color={colors.white} />
          <AppText
            variant="label"
            color={colors.white}
            numberOfLines={1}
            style={styles.flex}>
            {title}
          </AppText>
          <AppText variant="labelStrong" color={colors.white}>
            Mở ảnh
          </AppText>
        </View>
      </Pressable>

      <ImageViewerModal
        open={viewerOpen}
        uri={loadState.uri}
        title={title}
        reduceMotion={reduceMotion}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}

function ImageViewerModal({
  open,
  uri,
  title,
  reduceMotion,
  onClose,
}: {
  open: boolean;
  uri: string;
  title: string;
  reduceMotion: boolean;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const canvasHeight = Math.max(320, height - 154);

  return (
    <Modal
      visible={open}
      animationType={reduceMotion ? 'none' : 'fade'}
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}>
      <StatusBar style="light" />
      <SafeAreaView
        accessibilityViewIsModal
        edges={['top', 'bottom']}
        style={styles.viewer}>
        <View style={styles.viewerHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng trình xem ảnh"
            hitSlop={4}
            onPress={onClose}
            style={({ pressed }) => [
              styles.viewerIconButton,
              pressed && styles.viewerIconButtonPressed,
            ]}>
            <Ionicons name="close" size={25} color={colors.white} />
          </Pressable>
          <AppText
            variant="supportingStrong"
            color={colors.white}
            numberOfLines={1}
            style={styles.viewerTitle}>
            {title}
          </AppText>
          <View style={styles.viewerHeaderSpacer} />
        </View>

        <ZoomableImage
          uri={uri}
          title={title}
          width={width}
          height={canvasHeight}
          reduceMotion={reduceMotion}
        />

        <View style={styles.viewerHint}>
          <Ionicons name="resize-outline" size={18} color="#C8D6E8" />
          <AppText variant="supporting" color="#C8D6E8" style={styles.flex}>
            Chụm để phóng to · Chạm hai lần để đặt lại
          </AppText>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ZoomableImage({
  uri,
  title,
  width,
  height,
  reduceMotion,
}: {
  uri: string;
  title: string;
  width: number;
  height: number;
  reduceMotion: boolean;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const reset = useCallback(() => {
    const duration = reduceMotion ? 0 : 180;
    scale.value = withTiming(1, { duration });
    savedScale.value = 1;
    translateX.value = withTiming(0, { duration });
    translateY.value = withTiming(0, { duration });
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [
    reduceMotion,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    translateX,
    translateY,
  ]);

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          scale.value = clamp(savedScale.value * event.scale, 1, 4);
        })
        .onEnd(() => {
          savedScale.value = scale.value;
          if (scale.value <= 1) {
            translateX.value = withTiming(0, { duration: reduceMotion ? 0 : 180 });
            translateY.value = withTiming(0, { duration: reduceMotion ? 0 : 180 });
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
          }
        }),
    [
      reduceMotion,
      savedScale,
      savedTranslateX,
      savedTranslateY,
      scale,
      translateX,
      translateY,
    ],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(4)
        .onUpdate((event) => {
          if (scale.value <= 1) return;
          const maxX = (width * (scale.value - 1)) / 2;
          const maxY = (height * (scale.value - 1)) / 2;
          translateX.value = clamp(
            savedTranslateX.value + event.translationX,
            -maxX,
            maxX,
          );
          translateY.value = clamp(
            savedTranslateY.value + event.translationY,
            -maxY,
            maxY,
          );
        })
        .onEnd(() => {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        }),
    [
      height,
      savedTranslateX,
      savedTranslateY,
      scale,
      translateX,
      translateY,
      width,
    ],
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(250)
        .onEnd(() => {
          const duration = reduceMotion ? 0 : 180;
          const nextScale = scale.value > 1 ? 1 : 2.25;
          scale.value = withTiming(nextScale, { duration });
          savedScale.value = nextScale;
          if (nextScale === 1) {
            translateX.value = withTiming(0, { duration });
            translateY.value = withTiming(0, { duration });
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
          }
        }),
    [
      reduceMotion,
      savedScale,
      savedTranslateX,
      savedTranslateY,
      scale,
      translateX,
      translateY,
    ],
  );

  const gesture = useMemo(
    () => Gesture.Simultaneous(pinch, pan, doubleTap),
    [doubleTap, pan, pinch],
  );
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={[styles.zoomCanvas, { height }]}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.zoomContent, { height, width }, animatedStyle]}>
          <Image
            accessibilityLabel={`Ảnh toàn màn hình ${title}`}
            source={{ uri }}
            contentFit="contain"
            cachePolicy="memory-disk"
            style={styles.image}
          />
        </Animated.View>
      </GestureDetector>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đặt lại mức phóng ảnh"
        onPress={reset}
        style={({ pressed }) => [
          styles.resetButton,
          pressed && styles.viewerIconButtonPressed,
        ]}>
        <Ionicons name="contract-outline" size={17} color={colors.white} />
        <AppText variant="labelStrong" color={colors.white}>
          Vừa màn hình
        </AppText>
      </Pressable>
    </View>
  );
}

function useProtectedImage(
  rawUri: string | null | undefined,
  contentType: string | null | undefined,
  attempt: number,
  cacheScope: string | null | undefined,
): ImageLoadState {
  const resolvedUri = rawUri ? (absoluteApiUrl(rawUri) ?? rawUri) : null;
  const protectedUri =
    rawUri && resolvedUri ? isProtectedApiUri(rawUri, resolvedUri) : false;
  const requestKey =
    `${cacheScope ?? 'anonymous'}:${resolvedUri ?? 'missing'}:` +
    `${contentType ?? 'unknown'}:${attempt}`;
  const [result, setResult] = useState<{
    key: string;
    state: ImageLoadState;
  }>({
    key: '',
    state: { status: 'loading', uri: null, message: null },
  });

  useEffect(() => {
    if (!resolvedUri || !protectedUri) return;

    let active = true;
    let objectUrl: string | null = null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), DOWNLOAD_TIMEOUT_MS);

    void loadProtectedImage(
      resolvedUri,
      contentType,
      controller.signal,
      attempt > 0,
      cacheScope,
    )
      .then((result) => {
        objectUrl = result.objectUrl;
        if (active) {
          setResult({
            key: requestKey,
            state: { status: 'ready', uri: result.uri, message: null },
          });
        } else if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResult({
          key: requestKey,
          state: {
            status: 'error',
            uri: null,
            message:
              controller.signal.reason === 'timeout'
                ? 'Ảnh tải quá lâu. Kiểm tra kết nối rồi thử lại.'
                : imageErrorMessage(error),
          },
        });
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [
    attempt,
    cacheScope,
    contentType,
    protectedUri,
    requestKey,
    resolvedUri,
  ]);

  if (!resolvedUri) {
    return {
      status: 'error',
      uri: null,
      message: 'Không tìm thấy đường dẫn của ảnh này.',
    };
  }
  if (!protectedUri) {
    return { status: 'ready', uri: resolvedUri, message: null };
  }
  return result.key === requestKey
    ? result.state
    : { status: 'loading', uri: null, message: null };
}

async function loadProtectedImage(
  resolvedUri: string,
  contentType: string | null | undefined,
  signal: AbortSignal,
  forceDownload: boolean,
  cacheScope: string | null | undefined,
) {
  // Refresh the access token through the normal API pipeline before the file request.
  await apiFetch<unknown>('/auth/me', { signal });
  const token = getAccessToken();
  if (!token) {
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  return loadProtectedImageAsset({
    url: resolvedUri,
    token,
    cacheScope: cacheScope ?? token,
    contentType,
    signal,
    forceDownload,
  });
}

function isProtectedApiUri(rawUri: string, resolvedUri: string) {
  if (!/^https?:\/\//i.test(rawUri)) return true;
  const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return resolvedUri.startsWith(`${apiOrigin}/api/`);
}

function imageErrorMessage(error: unknown) {
  const message = getApiErrorMessage(error);
  if (/401|403|đăng nhập|phiên/i.test(message)) {
    return 'Phiên đăng nhập không còn hiệu lực. Hãy đăng nhập lại rồi thử lại.';
  }
  if (/404|không tìm thấy/i.test(message)) {
    return 'Ảnh này không còn tồn tại trên máy chủ.';
  }
  if (/network|fetch|kết nối|internet|download/i.test(message)) {
    return 'Không tải được ảnh. Kiểm tra Internet rồi thử lại.';
  }
  return message || 'Không tải được ảnh. Vui lòng thử lại.';
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  frame: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    overflow: 'hidden',
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imagePressed: {
    opacity: 0.88,
  },
  imageLabel: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 17, 31, 0.84)',
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    left: 0,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
    right: 0,
  },
  expandBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 17, 31, 0.82)',
    borderRadius: radii.pill,
    height: 38,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 38,
  },
  loadingFrame: {
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderColor: colors.primarySoft,
    borderWidth: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  errorFrame: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorIcon: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  centerText: {
    maxWidth: 300,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
  },
  retryButtonPressed: {
    backgroundColor: colors.primarySurface,
  },
  unavailable: {
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  pdf: {
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderColor: colors.primarySoft,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  pdfIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  viewer: {
    backgroundColor: '#07111F',
    flex: 1,
  },
  viewerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  viewerIconButton: {
    alignItems: 'center',
    backgroundColor: '#162235',
    borderRadius: radii.pill,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    width: layout.minTouchTarget,
  },
  viewerIconButtonPressed: {
    backgroundColor: '#26364D',
  },
  viewerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  viewerHeaderSpacer: {
    width: layout.minTouchTarget,
  },
  zoomCanvas: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  zoomContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    alignItems: 'center',
    backgroundColor: '#162235',
    borderRadius: radii.pill,
    bottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    position: 'absolute',
    right: spacing.md,
  },
  viewerHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.page,
  },
});
