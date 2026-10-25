import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { MOMOHeader, MOMOTextField, MOMOButton, MOMOToast } from '@/components/ui';

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubject('');
      setMessage('');
      setToastMessage('Cảm ơn bạn! Ý kiến đóng góp đã được gửi tới đội ngũ MOMO.');
    }, 1000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Trợ giúp & Hỗ trợ" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 22 }]}>
          Bạn có câu hỏi, thắc mắc hoặc cần hỗ trợ về widget màn hình chính? Hãy gửi lời nhắn và chúng mình sẽ giải đáp ngay nhé!
        </Text>

        <MOMOTextField
          label="Chủ đề"
          placeholder="Ví dụ: Thiết lập widget trên iOS 18"
          value={subject}
          onChangeText={setSubject}
        />

        <MOMOTextField
          label="Nội dung tin nhắn"
          placeholder="Chia sẻ với chúng mình trải nghiệm của bạn..."
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
        />

        <MOMOButton
          title="Gửi phản hồi"
          onPress={handleSubmit}
          loading={submitting}
          variant="primary"
          size="lg"
          style={{ width: '100%', marginTop: spacing.md }}
        />
      </ScrollView>

      <MOMOToast
        visible={!!toastMessage}
        message={toastMessage || ''}
        type="success"
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
}
