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
    setToastMessage(`${name} updated.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Privacy Settings" />

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
          MOMO is designed around intimacy and private peer-to-peer sharing. You have complete control over who can discover you and view your moments.
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
              <Text style={[typography.headline, { color: colors.text }]}>Private Circle Only</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Only approved friends can view moments you share.
              </Text>
            </View>
            <Switch
              value={privateAccount}
              onValueChange={() => toggleSetting('Privacy mode', setPrivateAccount, privateAccount)}
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
              <Text style={[typography.headline, { color: colors.text }]}>Allow Widget Caching</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Allow your moments to appear on authorized friends' home screens.
              </Text>
            </View>
            <Switch
              value={allowWidgetSnapshots}
              onValueChange={() => toggleSetting('Widget permission', setAllowWidgetSnapshots, allowWidgetSnapshots)}
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
              <Text style={[typography.headline, { color: colors.text }]}>Search by Email</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Allow friends to find your profile using your email address.
              </Text>
            </View>
            <Switch
              value={allowSearchByEmail}
              onValueChange={() => toggleSetting('Email searchability', setAllowSearchByEmail, allowSearchByEmail)}
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
