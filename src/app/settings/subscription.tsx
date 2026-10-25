import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { MOMOHeader, MOMOButton, MOMOToast } from '@/components/ui';

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();

  const [isSubscribing, setIsSubscribing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const perks = [
    'Không giới hạn widget màn hình chính cho bạn bè & nhóm',
    'Khung widget màu pastel độc quyền và chủ đề theo mùa',
    'Kho lưu trữ kỷ niệm độ phân giải gốc không nén',
    'Video điểm lại kỷ niệm hàng tháng & hàng năm mở rộng',
    'Hỗ trợ khách hàng ưu tiên & trải nghiệm tính năng sớm nhất',
  ];

  const handleSubscribe = () => {
    setIsSubscribing(true);
    setTimeout(() => {
      setIsSubscribing(false);
      setToastMessage('Chào mừng bạn đến với MOMO+! Đã mở khóa quyền lợi ✨');
    }, 1200);
  };

  const handleRestore = () => {
    setToastMessage('Đã kiểm tra gói mua. Không tìm thấy gói đăng ký trước đó.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="MOMO+ Cao cấp" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}>
        {/* Banner */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xxl,
            padding: spacing.xl,
            alignItems: 'center',
            marginBottom: spacing.xl,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radii.full,
              backgroundColor: colors.coralLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}>
            <Ionicons name="diamond" size={32} color={colors.coral} />
          </View>

          <Text style={[typography.title2, { fontWeight: '800', color: colors.text, textAlign: 'center' }]}>
            Khoảnh khắc nhỏ, trọn vẹn hơn.
          </Text>
          <Text
            style={[
              typography.subhead,
              { color: colors.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 20 },
            ]}>
            Mở khóa thiết kế widget tùy biến, nhóm riêng tư không giới hạn và kho lưu trữ kỷ niệm vĩnh viễn.
          </Text>

          <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
            <Text style={[typography.title1, { color: colors.coral, fontWeight: '900' }]}>
              69.000 đ <Text style={[typography.subhead, { color: colors.textSecondary }]}>/ tháng</Text>
            </Text>
          </View>
        </View>

        {/* Perks List */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: '700' }]}>
            QUYỀN LỢI ĐẶC BIỆT CỦA MOMO+
          </Text>

          {perks.map((perk, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                padding: spacing.md,
                borderRadius: radii.lg,
                marginBottom: spacing.xs,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
              <Ionicons name="checkmark-circle" size={20} color={colors.coral} style={{ marginRight: spacing.md }} />
              <Text style={[typography.callout, { color: colors.text, flex: 1 }]}>{perk}</Text>
            </View>
          ))}
        </View>

        {/* Subscribe & Restore Buttons */}
        <MOMOButton
          title="Nâng cấp lên MOMO+"
          onPress={handleSubscribe}
          loading={isSubscribing}
          variant="primary"
          size="lg"
          style={{ width: '100%', marginBottom: spacing.sm }}
        />

        <MOMOButton
          title="Khôi phục gói đã mua"
          onPress={handleRestore}
          variant="ghost"
          size="md"
          style={{ width: '100%' }}
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
