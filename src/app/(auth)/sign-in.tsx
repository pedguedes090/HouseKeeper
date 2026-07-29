import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Screen } from '@/components/ui/screen';
import { getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

const schema = z.object({
  email: z.string().trim().email('Email chưa đúng định dạng.'),
  password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự.'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await login(values.email, values.password);
      router.replace('/(tabs)');
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) });
    }
  });

  return (
    <Screen keyboardAware bottomInset={false} contentStyle={styles.screen}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="home-outline" size={32} color={colors.white} />
        </View>
        <View style={styles.brandCopy}>
          <AppText variant="headline" color={colors.primary}>
            HouseKeeper
          </AppText>
          <AppText variant="supporting" color={colors.inkMuted}>
            Mọi hạn quan trọng, trong một nơi.
          </AppText>
        </View>
      </View>

      <View style={styles.intro}>
        <AppText variant="headline">Chào mừng trở lại</AppText>
        <AppText color={colors.inkMuted}>
          Đăng nhập để xem giấy tờ, hóa đơn và bảo hành sắp tới.
        </AppText>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <FormField
              label="Email"
              placeholder="ban@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <FormField
              label="Mật khẩu"
              placeholder="Ít nhất 8 ký tự"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.password?.message}
            />
          )}
        />
        {errors.root?.message ? (
          <View accessibilityLiveRegion="assertive" style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <AppText variant="supporting" color={colors.danger} style={styles.errorText}>
              {errors.root.message}
            </AppText>
          </View>
        ) : null}
        <Button
          label="Đăng nhập"
          fullWidth
          loading={isSubmitting}
          onPress={() => void submit()}
        />
      </View>

      <View style={styles.switchRow}>
        <AppText variant="supporting" color={colors.inkMuted}>
          Chưa có tài khoản?
        </AppText>
        <Link href="/(auth)/sign-up" asChild>
          <Pressable accessibilityRole="link" style={styles.link}>
            <AppText variant="supportingStrong" color={colors.primary}>
              Tạo tài khoản
            </AppText>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.section,
    justifyContent: 'center',
    minHeight: '100%',
    paddingBottom: spacing.section,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  brandCopy: {
    flex: 1,
  },
  intro: {
    gap: spacing.sm,
  },
  form: {
    gap: spacing.lg,
  },
  errorBox: {
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorText: {
    flex: 1,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
