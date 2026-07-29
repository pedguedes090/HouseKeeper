import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/button';
import { initials } from '@/lib/format';
import { colors, layout, radii, spacing } from '@/theme/tokens';

interface AppHeaderProps {
  title?: string;
  greeting?: string;
  displayName?: string;
  back?: boolean;
  right?: ReactNode;
  onAvatarPress?: () => void;
}

export function AppHeader({
  title = 'HouseKeeper',
  greeting,
  displayName,
  back = false,
  right,
  onAvatarPress,
}: AppHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <View style={styles.leading}>
        {back ? (
          <IconButton icon="arrow-back" label="Quay lại" onPress={() => router.back()} />
        ) : displayName ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở cài đặt tài khoản"
            onPress={onAvatarPress}
            style={styles.avatar}>
            <AppText variant="labelStrong" color={colors.primary}>
              {initials(displayName)}
            </AppText>
          </Pressable>
        ) : (
          <View style={styles.brandIcon}>
            <Ionicons name="home-outline" size={19} color={colors.white} />
          </View>
        )}
        <View style={styles.titleBlock}>
          {greeting ? (
            <AppText variant="label" color={colors.inkMuted}>
              {greeting}
            </AppText>
          ) : null}
          <AppText
            variant={greeting ? 'title' : 'headline'}
            color={greeting ? colors.ink : colors.primary}
            numberOfLines={1}>
            {displayName ?? title}
          </AppText>
        </View>
      </View>
      {right}
    </View>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="title">{title}</AppText>
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={styles.sectionAction}>
          <AppText variant="labelStrong" color={colors.primary}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.canvas,
    flexDirection: 'row',
    height: layout.headerHeight,
    justifyContent: 'space-between',
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: spacing.page,
    width: '100%',
  },
  leading: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  brandIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  titleBlock: {
    flexShrink: 1,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.sm,
  },
});
