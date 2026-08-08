import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { LoadingState } from '@/components/ui/feedback';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/providers/auth-provider';
import { colors, layout, typography } from '@/theme/tokens';

const tabs = [
  { name: 'index', title: 'Trang chủ', icon: 'home-outline', activeIcon: 'home' },
  { name: 'calendar', title: 'Lịch', icon: 'calendar-outline', activeIcon: 'calendar' },
  { name: 'scan', title: 'Quét', icon: 'scan-outline', activeIcon: 'scan' },
  { name: 'spending', title: 'Chi tiêu', icon: 'wallet-outline', activeIcon: 'wallet' },
  { name: 'documents', title: 'Giấy tờ', icon: 'id-card-outline', activeIcon: 'id-card' },
  { name: 'inventory', title: 'Tài sản', icon: 'file-tray-outline', activeIcon: 'file-tray-full' },
] as const;

export default function TabsLayout() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <Screen scroll={false} bottomInset={false}>
        <LoadingState />
      </Screen>
    );
  }
  if (status === 'anonymous') return <Redirect href="/(auth)/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: typography.label,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderColor: colors.border,
          borderTopWidth: 1,
          height: layout.tabBarHeight,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}>
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons
                name={focused ? tab.activeIcon : tab.icon}
                color={color}
                size={Math.max(size, 21)}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
