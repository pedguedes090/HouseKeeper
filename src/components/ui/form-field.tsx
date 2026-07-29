import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardTypeOptions,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { formatDate } from '@/lib/format';
import { colors, layout, radii, spacing, typography } from '@/theme/tokens';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  textContentType?: 'emailAddress' | 'password' | 'newPassword' | 'name';
  autoComplete?: 'email' | 'password' | 'new-password' | 'name' | 'off';
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline = false,
  ...inputProps
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <AppText variant="supportingStrong" color={colors.inkMuted}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        allowFontScaling
        maxFontSizeMultiplier={1.6}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={colors.primary}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          error && styles.error,
        ]}
        {...inputProps}
      />
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <AppText variant="label" color={colors.danger}>
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange,
  allowEmpty = true,
  error,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  allowEmpty?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T12:00:00`) : new Date();

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fieldGroup}>
        <AppText variant="supportingStrong" color={colors.inkMuted}>
          {label}
        </AppText>
        <View style={styles.dateRow}>
          <View style={[styles.input, styles.dateInput, error && styles.error]}>
            <TextInput
              accessibilityLabel={label}
              value={value ?? ''}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.placeholder}
              onChangeText={(nextValue) => onChange(nextValue || null)}
              maxLength={10}
              style={styles.webDateText}
            />
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </View>
          {allowEmpty && value ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xóa ${label}`}
              onPress={() => onChange(null)}
              style={styles.clearButton}>
              <Ionicons name="close" size={20} color={colors.inkMuted} />
            </Pressable>
          ) : null}
        </View>
        {error ? (
          <AppText variant="label" color={colors.danger}>
            {error}
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.fieldGroup}>
      <AppText variant="supportingStrong" color={colors.inkMuted}>
        {label}
      </AppText>
      <View style={styles.dateRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${formatDate(value)}`}
          onPress={() => setOpen(true)}
          style={[styles.input, styles.dateInput, error && styles.error]}>
          <AppText color={value ? colors.ink : colors.placeholder}>
            {value ? formatDate(value) : 'Chọn ngày'}
          </AppText>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </Pressable>
        {allowEmpty && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xóa ${label}`}
            onPress={() => onChange(null)}
            style={styles.clearButton}>
            <Ionicons name="close" size={20} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selectedDate) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (selectedDate) {
              const year = selectedDate.getFullYear();
              const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const day = String(selectedDate.getDate()).padStart(2, '0');
              onChange(`${year}-${month}-${day}`);
            }
          }}
        />
      ) : null}
      {error ? (
        <AppText variant="label" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.transparent,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  multiline: {
    minHeight: 112,
    textAlignVertical: 'top',
  },
  focused: {
    borderColor: colors.primary,
    borderWidth: 2,
    paddingHorizontal: spacing.lg - 1,
    paddingVertical: spacing.md - 1,
  },
  error: {
    borderColor: colors.danger,
  },
  errorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateInput: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  webDateText: {
    color: colors.ink,
    flex: 1,
    ...typography.body,
  },
  clearButton: {
    alignItems: 'center',
    height: layout.minTouchTarget,
    justifyContent: 'center',
    width: layout.minTouchTarget,
  },
});
