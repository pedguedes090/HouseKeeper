import { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/theme/tokens';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  bottomInset?: boolean;
  keyboardAware?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  header?: ReactNode;
}

export function Screen({
  children,
  scroll = true,
  bottomInset = true,
  keyboardAware = false,
  edges = ['top'],
  contentStyle,
  header,
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        bottomInset && styles.bottomInset,
        contentStyle,
      ]}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex, bottomInset && styles.bottomInset, contentStyle]}>
      {children}
    </View>
  );

  const body = (
    <>
      {header}
      {content}
    </>
  );

  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      {keyboardAware ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function CenteredContent({ children }: PropsWithChildren) {
  return <View style={styles.centered}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    gap: spacing.xl,
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    width: '100%',
  },
  bottomInset: {
    paddingBottom: spacing.screenBottom,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
