import React, { useState } from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { MOMOHeader, MOMOToast } from '@/components/ui';

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();

  const [privateAccount, setPrivateAccount] = useState(true);
  const [allowSearchByEmail, setAllowSearchByEmail] = useState(false);
  const [allowWidgetSnapshots, setAllowWidgetSnapshots] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleSetting = (name: string, setter: (val: boolean) => void, current: boolean) => {
    setter(!current);
    setToastMessage(`Đã cập nhật cài đặt ${name}.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Quyền riêng tư & Bảo mật" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}>
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 22 },
          ]}>
          MOMO được thiết kế xoay quanh tính riêng tư và chia sẻ gần gũi. Bạn có toàn quyền kiểm soát ai có thể nhìn thấy hồ sơ và khoảnh khắc của bạn.
        </Text>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.lg,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={[typography.headline, { color: colors.text }]}>Chỉ vòng bạn thân</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Chỉ những bạn bè đã được duyệt mới xem được khoảnh khắc bạn đăng tải.
              </Text>
            </View>
            <Switch
              value={privateAccount}
              onValueChange={() => toggleSetting('Chế độ riêng tư', setPrivateAccount, privateAccount)}
              trackColor={{ false: colors.border, true: colors.coral }}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.lg,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={[typography.headline, { color: colors.text }]}>Cho phép hiển thị trên Widget bạn bè</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Khoảnh khắc mới của bạn sẽ xuất hiện trên widget màn hình chính của bạn thân.
              </Text>
            </View>
            <Switch
              value={allowWidgetSnapshots}
              onValueChange={() => toggleSetting('Hiển thị Widget', setAllowWidgetSnapshots, allowWidgetSnapshots)}
              trackColor={{ false: colors.border, true: colors.coral }}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.lg,
            }}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={[typography.headline, { color: colors.text }]}>Tìm kiếm bằng Email</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Cho phép bạn bè tìm thấy bạn bằng địa chỉ email.
              </Text>
            </View>
            <Switch
              value={allowSearchByEmail}
              onValueChange={() => toggleSetting('Tìm kiếm bằng Email', setAllowSearchByEmail, allowSearchByEmail)}
              trackColor={{ false: colors.border, true: colors.coral }}
            />
          </View>
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
