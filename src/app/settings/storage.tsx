import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { MOMOHeader, MOMOButton, MOMOToast } from '@/components/ui';

export default function StorageScreen() {
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleClearCache = () => {
    setToastMessage('Đã dọn dẹp sạch bộ nhớ đệm ảnh.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Dung lượng & Dữ liệu bộ nhớ" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            padding: spacing.xl,
            marginBottom: spacing.lg,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.xs }]}>
            Bộ nhớ thiết bị cục bộ
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
            Khoảnh khắc và widget được lưu đệm trên máy để xem nhanh khi mất mạng và phản hồi tức thì trên màn hình chính.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={[typography.callout, { color: colors.text }]}>Bộ nhớ đệm ảnh</Text>
            <Text style={[typography.callout, { fontWeight: '700', color: colors.coral }]}>14.2 MB</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <Text style={[typography.callout, { color: colors.text }]}>Ảnh chụp Widget</Text>
            <Text style={[typography.callout, { fontWeight: '700', color: colors.coral }]}>1.8 MB</Text>
          </View>

          <MOMOButton
            title="Xóa bộ nhớ đệm ảnh"
            onPress={handleClearCache}
            variant="outline"
            size="md"
            style={{ width: '100%' }}
          />
        </View>
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
