import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import { DefaultTheme, Redirect, Stack, ThemeProvider, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { LoadingState } from '@/components/ui/feedback';
import { Screen } from '@/components/ui/screen';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { AppProvider } from '@/providers/app-provider';
import { useAuth } from '@/providers/auth-provider';
import { colors, typography } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.canvas,
    card: colors.canvas,
    text: colors.ink,
    border: colors.border,
    notification: colors.danger,
  },
  fonts: {
    regular: {
      fontFamily: typography.body.fontFamily,
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: typography.bodyMedium.fontFamily,
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: typography.title.fontFamily,
      fontWeight: '600' as const,
    },
    heavy: {
      fontFamily: typography.display.fontFamily,
      fontWeight: '700' as const,
    },
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AppProvider>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="dark" />
        <NavigationGate />
      </ThemeProvider>
    </AppProvider>
  );
}

function NavigationGate() {
  const { status } = useAuth();
  const reducedMotion = useReducedMotion();
  const segments = useSegments();
  if (status === 'loading') {
    return (
      <Screen scroll={false} bottomInset={false}>
        <LoadingState label="Đang mở House Keeper…" />
      </Screen>
    );
  }
  const inAuthGroup = segments[0] === '(auth)';
  if (status === 'anonymous' && !inAuthGroup) {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (status === 'authenticated' && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? 'none' : 'slide_from_right',
        contentStyle: { backgroundColor: colors.canvas },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="assistant" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="documents/[id]" />
      <Stack.Screen name="documents/form" />
      <Stack.Screen name="bills/[id]" />
      <Stack.Screen name="bills/form" />
      <Stack.Screen name="spending/jars" />
      <Stack.Screen name="spending/jar/[id]" />
      <Stack.Screen name="spending/expense/form" />
      <Stack.Screen name="property/[id]" />
      <Stack.Screen name="property/form" />
      <Stack.Screen
        name="scan/review/[id]"
        options={{
          animation: reducedMotion ? 'none' : 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}
