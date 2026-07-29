import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

const schema = z
  .object({
    displayName: z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự.').max(100),
    email: z.string().trim().email('Email chưa đúng định dạng.'),
    password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự.').max(72),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại chưa khớp.',
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const submit = handleSubmit(async ({ confirmPassword: _, ...values }) => {
    try {
      await register(values);
      router.replace('/(tabs)');
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) });
    }
  });

  return (
    <Screen
      keyboardAware
      bottomInset={false}
      header={<AppHeader title="Tạo tài khoản" back />}>
      <View style={styles.intro}>
        <AppText variant="headline">Bắt đầu quản lý nhẹ đầu hơn</AppText>
        <AppText color={colors.inkMuted}>
          Bạn có thể thêm dữ liệu thủ công hoặc quét bằng AI sau khi đăng ký.
        </AppText>
      </View>
      <View style={styles.form}>
        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <FormField
              label="Tên hiển thị"
              placeholder="Nguyễn Anh Tuấn"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.displayName?.message}
            />
          )}
        />
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
              placeholder="Từ 8 đến 72 ký tự"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.password?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field }) => (
            <FormField
              label="Nhập lại mật khẩu"
              placeholder="Nhập lại mật khẩu"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.confirmPassword?.message}
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
          label="Tạo tài khoản"
          fullWidth
          loading={isSubmitting}
          onPress={() => void submit()}
        />
      </View>
      <View style={styles.switchRow}>
        <AppText variant="supporting" color={colors.inkMuted}>
          Đã có tài khoản?
        </AppText>
        <Link href="/(auth)/sign-in" asChild>
          <Pressable accessibilityRole="link" style={styles.link}>
            <AppText variant="supportingStrong" color={colors.primary}>
              Đăng nhập
            </AppText>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
});
