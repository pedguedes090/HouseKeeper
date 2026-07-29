import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/button';
import { AppHeader } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { formatDate } from '@/lib/format';
import { housekeeperApi } from '@/lib/housekeeper-api';
import {
  AssistantAnswer,
  AssistantHistoryMessage,
  AssistantItem,
} from '@/lib/types';
import { colors, layout, radii, shadows, spacing, typography } from '@/theme/tokens';

const initialSuggestions = [
  {
    icon: 'receipt-outline',
    text: 'Tháng này tôi còn hóa đơn nào chưa trả?',
  },
  {
    icon: 'id-card-outline',
    text: 'Giấy tờ nào sắp hết hạn?',
  },
  {
    icon: 'shield-checkmark-outline',
    text: 'Thiết bị nào sắp hết bảo hành?',
  },
  {
    icon: 'repeat-outline',
    text: 'Tổng chi cho dịch vụ định kỳ là bao nhiêu?',
  },
] as const;

const followUpByIntent: Record<string, string[]> = {
  UNPAID_BILLS: [
    'Tổng số tiền tôi cần trả là bao nhiêu?',
    'Khoản nào đang quá hạn?',
  ],
  OVERDUE_BILLS: [
    'Khoản nào cần ưu tiên trước?',
    'Tuần này còn khoản nào đến hạn?',
  ],
  RECURRING_SERVICES: [
    'Dịch vụ nào đang tự gia hạn?',
    'Tổng chi định kỳ mỗi tháng là bao nhiêu?',
  ],
  EXPIRING_DOCUMENTS: [
    'Giấy tờ nào hết hạn sớm nhất?',
    'Trong 30 ngày tới có giấy tờ nào hết hạn?',
  ],
  EXPIRING_WARRANTIES: [
    'Thiết bị nào hết bảo hành sớm nhất?',
    'Trong 30 ngày tới có bảo hành nào hết?',
  ],
};

type AskVariables = {
  question: string;
  history: AssistantHistoryMessage[];
};

type Message =
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'assistant';
      text: string;
      answer?: AssistantAnswer;
      retry?: AskVariables;
      isError?: boolean;
    };

const welcomeMessage: Message = {
  id: 'welcome',
  role: 'assistant',
  text: 'Mình tra cứu trực tiếp dữ liệu bạn đã lưu để giúp kiểm tra hạn, khoản cần trả và chi phí định kỳ.',
};

export default function AssistantScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const listRef = useRef<FlatList<Message>>(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const ask = useMutation({
    mutationFn: ({ question: value, history }: AskVariables) =>
      housekeeperApi.askAssistant(value, history),
    onSuccess: (answer) => {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: answer.message,
          answer,
        },
      ]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error, variables) => {
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          text:
            error.message ||
            'Mình chưa thể tra cứu dữ liệu lúc này. Bạn có thể thử lại ngay.',
          retry: variables,
          isError: true,
        },
      ]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const latestAnswer = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (message): message is Extract<Message, { role: 'assistant' }> =>
            message.role === 'assistant' && Boolean(message.answer),
        )?.answer,
    [messages],
  );
  const followUps = latestAnswer
    ? followUpByIntent[latestAnswer.intent] ?? [
        'Việc nào cần ưu tiên nhất?',
        'Có gì đến hạn trong 30 ngày tới?',
      ]
    : [];
  const showInitialSuggestions = messages.length === 1 && !ask.isPending;
  const lastMessage = messages[messages.length - 1];
  const showFollowUps =
    !ask.isPending &&
    lastMessage?.role === 'assistant' &&
    Boolean(latestAnswer) &&
    !('isError' in lastMessage && lastMessage.isError);

  useEffect(() => {
    const timer = setTimeout(
      () => listRef.current?.scrollToEnd({ animated: !reducedMotion }),
      40,
    );
    return () => clearTimeout(timer);
  }, [ask.isPending, messages, reducedMotion]);

  function historyFromConversation(): AssistantHistoryMessage[] {
    return messages
      .filter((message) => message.id !== 'welcome' && !('isError' in message && message.isError))
      .map<AssistantHistoryMessage>((message) => ({
        role: message.role === 'user' ? 'USER' : 'ASSISTANT',
        content: message.text,
      }))
      .slice(-10);
  }

  function submit(value = question) {
    const trimmed = value.trim();
    if (!trimmed || ask.isPending) return;
    const variables = {
      question: trimmed,
      history: historyFromConversation(),
    } satisfies AskVariables;
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: trimmed },
    ]);
    setQuestion('');
    Keyboard.dismiss();
    ask.mutate(variables);
  }

  function retry(messageId: string, variables: AskVariables) {
    if (ask.isPending) return;
    setMessages((current) => current.filter((message) => message.id !== messageId));
    ask.mutate(variables);
  }

  function resetConversation() {
    if (ask.isPending) return;
    setQuestion('');
    setMessages([welcomeMessage]);
  }

  function openItem(item: AssistantItem) {
    const routeId = item.routeId || item.id;
    if (item.type === 'DOCUMENT') {
      router.push(`/documents/${routeId}`);
    } else if (item.type === 'ASSET' || item.type === 'MAINTENANCE') {
      router.push(`/property/${routeId}`);
    } else if (
      item.type === 'BILL' ||
      item.type === 'RECURRING_BILL' ||
      item.type === 'BILL_PAYMENT'
    ) {
      router.push(`/bills/${routeId}`);
    }
  }

  return (
    <Screen
      scroll={false}
      keyboardAware
      bottomInset={false}
      edges={['top', 'bottom']}
      header={
        <AppHeader
          back
          title="Trợ lý House Keeper"
          right={
            <IconButton
              icon="refresh-outline"
              label="Bắt đầu cuộc trò chuyện mới"
              onPress={resetConversation}
            />
          }
        />
      }
      contentStyle={styles.screen}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ConversationMessage
            message={item}
            onOpenItem={openItem}
            onRetry={(variables) => retry(item.id, variables)}
            reducedMotion={reducedMotion}
          />
        )}
        ListFooterComponent={
          <>
            {ask.isPending ? (
              <TypingIndicator reducedMotion={reducedMotion} />
            ) : null}
            {showInitialSuggestions ? (
              <View style={styles.suggestionSection}>
                <AppText variant="supportingStrong">Bạn có thể hỏi</AppText>
                {initialSuggestions.map((suggestion) => (
                  <SuggestionRow
                    key={suggestion.text}
                    icon={suggestion.icon}
                    text={suggestion.text}
                    onPress={() => submit(suggestion.text)}
                  />
                ))}
              </View>
            ) : null}
            {showFollowUps ? (
              <View style={styles.followUpSection}>
                <AppText variant="label" color={colors.inkMuted}>
                  Hỏi tiếp
                </AppText>
                <View style={styles.followUps}>
                  {followUps.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      accessibilityRole="button"
                      onPress={() => submit(suggestion)}
                      style={({ pressed }) => [
                        styles.followUpChip,
                        pressed && styles.pressed,
                      ]}>
                      <AppText variant="labelStrong" color={colors.primary}>
                        {suggestion}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        }
      />

      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Câu hỏi cho trợ lý"
          placeholder="Ví dụ: khoản nào cần trả trước?"
          placeholderTextColor={colors.placeholder}
          value={question}
          editable={!ask.isPending}
          onChangeText={setQuestion}
          onSubmitEditing={() => submit()}
          returnKeyType="send"
          blurOnSubmit={false}
          multiline
          maxLength={1000}
          style={styles.input}
        />
        <Pressable
          accessibilityLabel="Gửi câu hỏi"
          accessibilityRole="button"
          accessibilityState={{
            disabled: !question.trim() || ask.isPending,
            busy: ask.isPending,
          }}
          disabled={!question.trim() || ask.isPending}
          onPress={() => submit()}
          style={({ pressed }) => [
            styles.sendButton,
            (!question.trim() || ask.isPending) && styles.sendButtonDisabled,
            pressed && styles.sendButtonPressed,
          ]}>
          <Ionicons
            name={ask.isPending ? 'hourglass-outline' : 'arrow-up'}
            size={21}
            color={colors.white}
          />
        </Pressable>
      </View>
    </Screen>
  );
}

function ConversationMessage({
  message,
  onOpenItem,
  onRetry,
  reducedMotion,
}: {
  message: Message;
  onOpenItem: (item: AssistantItem) => void;
  onRetry: (variables: AskVariables) => void;
  reducedMotion: boolean;
}) {
  const isUser = message.role === 'user';
  const isError = !isUser && 'isError' in message && message.isError;
  const answer = !isUser && 'answer' in message ? message.answer : undefined;
  const retryVariables = !isUser && 'retry' in message ? message.retry : undefined;

  return (
    <Animated.View
      accessibilityLiveRegion={
        !isUser && message.id !== 'welcome' ? 'polite' : 'none'
      }
      entering={
        reducedMotion
          ? undefined
          : FadeInDown.duration(180)
      }
      style={[
        styles.message,
        isUser ? styles.userMessage : styles.assistantMessage,
      ]}>
      {!isUser ? (
        <View
          style={[
            styles.aiIcon,
            isError && { backgroundColor: colors.dangerSoft },
          ]}>
          <Ionicons
            name={isError ? 'alert-circle-outline' : 'sparkles'}
            size={17}
            color={isError ? colors.danger : colors.primary}
          />
        </View>
      ) : null}
      <View style={styles.messageBody}>
        <AppText
          variant="supporting"
          color={isUser ? colors.white : colors.ink}>
          {message.text}
        </AppText>

        {answer?.items.length ? (
          <View style={styles.answerItems}>
            {answer.items.map((item, index) => (
              <Pressable
                key={`${item.type}-${item.id}`}
                accessibilityHint={
                  canOpenItem(item) ? 'Mở bản ghi liên quan' : undefined
                }
                accessibilityRole={canOpenItem(item) ? 'button' : undefined}
                disabled={!canOpenItem(item)}
                onPress={canOpenItem(item) ? () => onOpenItem(item) : undefined}
                style={({ pressed }) => [
                  styles.answerItem,
                  index < answer.items.length - 1 && styles.answerItemDivider,
                  pressed && canOpenItem(item) && styles.answerItemPressed,
                ]}>
                <View style={styles.resultIcon}>
                  <Ionicons
                    name={iconForItem(item.type)}
                    size={19}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.flex}>
                  <AppText variant="supportingStrong" numberOfLines={2}>
                    {item.title}
                  </AppText>
                  <AppText variant="label" color={colors.inkMuted}>
                    {[item.dueDate ? formatDate(item.dueDate) : null, item.detail]
                      .filter(Boolean)
                      .join(' · ')}
                  </AppText>
                </View>
                {canOpenItem(item) ? (
                  <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {answer ? (
          <View style={styles.grounded}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
            <AppText variant="label" color={colors.success}>
              Dựa trên dữ liệu đã lưu
            </AppText>
          </View>
        ) : null}

        {retryVariables ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onRetry(retryVariables)}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.pressed,
            ]}>
            <Ionicons name="refresh" size={17} color={colors.danger} />
            <AppText variant="labelStrong" color={colors.danger}>
              Thử lại câu hỏi này
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

function SuggestionRow({
  icon,
  text,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
      <View style={styles.suggestionIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <AppText variant="supporting" color={colors.ink} style={styles.flex}>
        {text}
      </AppText>
      <Ionicons name="arrow-forward" size={18} color={colors.primary} />
    </Pressable>
  );
}

function TypingIndicator({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Animated.View
      accessibilityLabel="Trợ lý đang kiểm tra dữ liệu"
      accessibilityLiveRegion="polite"
      entering={
        reducedMotion
          ? undefined
          : FadeInDown.duration(160)
      }
      style={[styles.message, styles.assistantMessage]}>
      <View style={styles.aiIcon}>
        <Ionicons name="sparkles" size={17} color={colors.primary} />
      </View>
      <View style={styles.typingCopy}>
        <AppText variant="label" color={colors.inkMuted}>
          Đang kiểm tra dữ liệu
        </AppText>
        <View style={styles.typingDots}>
          {[0, 130, 260].map((delay) => (
            <TypingDot key={delay} delay={delay} reducedMotion={reducedMotion} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

function TypingDot({
  delay,
  reducedMotion,
}: {
  delay: number;
  reducedMotion: boolean;
}) {
  const opacity = useSharedValue(reducedMotion ? 0.65 : 0.3);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 0.65;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withDelay(delay, withTiming(1, { duration: 180 })),
        withTiming(0.3, { duration: 220 }),
        withDelay(260, withTiming(0.3, { duration: 1 })),
      ),
      -1,
      false,
    );
  }, [delay, opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.typingDot, animatedStyle]} />;
}

function iconForItem(type: string): keyof typeof Ionicons.glyphMap {
  if (type === 'DOCUMENT') return 'id-card-outline';
  if (type === 'ASSET') return 'cube-outline';
  if (type === 'RECURRING_BILL') return 'repeat-outline';
  if (type === 'BILL_PAYMENT') return 'card-outline';
  if (type === 'MAINTENANCE') return 'build-outline';
  return 'receipt-outline';
}

function canOpenItem(item: AssistantItem) {
  return (
    Boolean(item.routeId || item.id) &&
    [
      'BILL',
      'RECURRING_BILL',
      'BILL_PAYMENT',
      'DOCUMENT',
      'ASSET',
      'MAINTENANCE',
    ].includes(item.type)
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 0,
    paddingBottom: 0,
    paddingTop: 0,
  },
  messageList: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  message: {
    flexDirection: 'row',
    gap: spacing.sm,
    maxWidth: '92%',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    borderTopRightRadius: radii.xs,
    maxWidth: '84%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  aiIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  messageBody: {
    flex: 1,
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  answerItems: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  answerItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 68,
    padding: spacing.md,
  },
  answerItemDivider: {
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
  },
  answerItemPressed: {
    backgroundColor: colors.primarySurface,
  },
  resultIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  grounded: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
  },
  suggestionSection: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  suggestion: {
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 58,
    padding: spacing.md,
  },
  suggestionIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  followUpSection: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  followUps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  followUpChip: {
    backgroundColor: colors.primarySurface,
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.68,
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    ...shadows.low,
  },
  input: {
    color: colors.ink,
    flex: 1,
    maxHeight: 112,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    width: layout.minTouchTarget,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  sendButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  typingCopy: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  typingDots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  typingDot: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 5,
    width: 5,
  },
  flex: {
    flex: 1,
  },
});
