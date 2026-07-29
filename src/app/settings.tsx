import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationSheet } from '@/components/ui/confirmation-sheet';
import { DetailRow } from '@/components/ui/detail-row';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { API_BASE_URL } from '@/lib/api';
import { initials } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [logoutSheetVisible, setLogoutSheetVisible] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  async function confirmLogout() {
    setLogoutPending(true);
    try {
      await logout();
    } catch {
      // logout() always clears the local session in its finally block.
    } finally {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLogoutPending(false);
    }
  }

  return (
    <Screen header={<AppHeader back title="Tài khoản & Cài đặt" />}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <AppText variant="headline" color={colors.primary}>
            {initials(user?.displayName ?? 'HK')}
          </AppText>
        </View>
        <AppText variant="title">{user?.displayName ?? 'Người dùng House Keeper'}</AppText>
        <AppText variant="supporting" color={colors.inkMuted}>
          {user?.email}
        </AppText>
      </View>

      <Card>
        <DetailRow label="Múi giờ" value={user?.timeZone ?? 'Asia/Ho_Chi_Minh'} />
        <DetailRow label="Ngôn ngữ" value="Tiếng Việt" />
        <DetailRow
          label="Phiên bản"
          value={Constants.expoConfig?.version ?? '1.0.0'}
          last
        />
      </Card>

      <Card tone="soft" style={styles.server}>
        <Ionicons name="server-outline" size={24} color={colors.primary} />
        <View style={styles.flex}>
          <AppText variant="supportingStrong">Máy chủ đang sử dụng</AppText>
          <AppText variant="label" color={colors.inkMuted} selectable>
            {API_BASE_URL}
          </AppText>
        </View>
      </Card>

      <Card style={styles.security}>
        <Ionicons name="shield-checkmark-outline" size={24} color={colors.success} />
        <View style={styles.flex}>
          <AppText variant="supportingStrong">Dữ liệu của bạn được bảo vệ</AppText>
          <AppText variant="label" color={colors.inkMuted}>
            Mã truy cập được lưu trong vùng bảo mật của thiết bị. House Keeper không tự xác nhận dữ liệu AI thay bạn.
          </AppText>
        </View>
      </Card>

      <Button
        label="Đăng xuất"
        variant="secondary"
        icon="log-out-outline"
        fullWidth
        onPress={() => setLogoutSheetVisible(true)}
      />

      <ConfirmationSheet
        visible={logoutSheetVisible}
        status={logoutPending ? 'loading' : 'confirm'}
        title="Đăng xuất?"
        description="Phiên đăng nhập trên thiết bị này sẽ kết thúc. Bạn có thể đăng nhập lại bất cứ lúc nào."
        confirmLabel="Đăng xuất"
        confirmVariant="danger"
        icon="log-out-outline"
        tone="danger"
        loadingTitle="Đang đăng xuất"
        loadingDescription="House Keeper đang kết thúc phiên đăng nhập an toàn."
        onConfirm={() => void confirmLogout()}
        onDismiss={() => {
          if (!logoutPending) setLogoutSheetVisible(false);
        }}
        testID="logout-confirmation-sheet"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  server: {
    alignItems: 'flex-start',
    borderColor: colors.primarySoft,
    flexDirection: 'row',
    gap: spacing.md,
  },
  security: {
    alignItems: 'flex-start',
    borderColor: colors.successSoft,
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
    gap: spacing.xs,
  },
});
