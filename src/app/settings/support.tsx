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
      setToastMessage('Thank you! Your feedback has been sent to our team.');
    }, 1000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Help & Support" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 22 }]}>
          Have questions, thoughts, or need help with home-screen widgets? Send us a note and we'll be glad to help!
        </Text>

        <MOMOTextField
          label="Subject"
          placeholder="e.g. Widget setup on iOS 18"
          value={subject}
          onChangeText={setSubject}
        />

        <MOMOTextField
          label="Message"
          placeholder="Tell us what you experienced..."
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
        />

        <MOMOButton
          title="Send Feedback"
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
