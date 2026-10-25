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
    setToastMessage('Image cache cleared successfully.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Storage & Cache" />

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
            Local Device Storage
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
            Moments and widgets are cached locally to provide instant offline viewing and home-screen responsiveness.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={[typography.callout, { color: colors.text }]}>Photo Cache</Text>
            <Text style={[typography.callout, { fontWeight: '700', color: colors.coral }]}>14.2 MB</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <Text style={[typography.callout, { color: colors.text }]}>Widget Snapshots</Text>
            <Text style={[typography.callout, { fontWeight: '700', color: colors.coral }]}>1.8 MB</Text>
          </View>

          <MOMOButton
            title="Clear Photo Cache"
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
