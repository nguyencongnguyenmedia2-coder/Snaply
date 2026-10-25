import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { MOMOHeader, MOMOButton, MOMOTextField, MOMOToast } from '@/components/ui';

export default function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { momentId } = useLocalSearchParams<{ momentId: string }>();
  const { colors, typography, spacing, radii } = useTheme();

  const [selectedReason, setSelectedReason] = useState<string>('inappropriate');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reasons = [
    { id: 'inappropriate', label: 'Hình ảnh không phù hợp hoặc nhạy cảm' },
    { id: 'harassment', label: 'Quấy rối hoặc bắt nạt' },
    { id: 'spam', label: 'Spam hoặc quảng cáo không mong muốn' },
    { id: 'privacy', label: 'Vi phạm quyền riêng tư hoặc chưa có sự đồng ý' },
  ];

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setToastMessage('Đã gửi báo cáo. Chúng tôi luôn ưu tiên an toàn và sự riêng tư.');
      setTimeout(() => router.back(), 1500);
    }, 900);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Báo cáo nội dung" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 22 }]}>
          Vui lòng chọn lý do báo cáo khoảnh khắc này. Đội ngũ quản trị sẽ xem xét ngay để giữ cho MOMO luôn an toàn và thân thiện.
        </Text>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            marginBottom: spacing.xl,
          }}>
          {reasons.map((r, i) => {
            const isSelected = selectedReason === r.id;
            return (
              <Pressable
                key={r.id}
                onPress={() => setSelectedReason(r.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.md,
                  borderBottomWidth: i < reasons.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}>
                <Text style={[typography.callout, { color: colors.text, flex: 1, fontWeight: '600' }]}>
                  {r.label}
                </Text>
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={isSelected ? colors.coral : colors.textSecondary}
                />
              </Pressable>
            );
          })}
        </View>

        <MOMOTextField
          label="Thông tin chi tiết thêm (Không bắt buộc)"
          placeholder="Mô tả cụ thể vấn đề nếu cần..."
          value={details}
          onChangeText={setDetails}
          multiline
          numberOfLines={3}
        />

        <MOMOButton
          title="Gửi báo cáo"
          onPress={handleSubmit}
          loading={submitting}
          variant="danger"
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
