import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui/feedback';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/providers/auth-provider';

export default function AuthLayout() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <Screen scroll={false} bottomInset={false}>
        <LoadingState />
      </Screen>
    );
  }
  if (status === 'authenticated') return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
