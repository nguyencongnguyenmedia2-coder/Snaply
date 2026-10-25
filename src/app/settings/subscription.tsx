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
    'Unlimited home-screen widgets for friends & circles',
    'Exclusive pastel widget frames & seasonal themes',
    'Full resolution uncompressed memories vault',
    'Extended monthly & annual memory video recaps',
    'Priority customer support & early access features',
  ];

  const handleSubscribe = () => {
    setIsSubscribing(true);
    setTimeout(() => {
      setIsSubscribing(false);
      setToastMessage('Welcome to MOMO+! Entitlements unlocked ✨');
    }, 1200);
  };

  const handleRestore = () => {
    setToastMessage('Purchases checked. No prior subscription found.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="MOMO+ Premium" />

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
            Little moments, enhanced.
          </Text>
          <Text
            style={[
              typography.subhead,
              { color: colors.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 20 },
            ]}>
            Unlock custom widget designs, unlimited intimate circles, and full archival storage.
          </Text>

          <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
            <Text style={[typography.title1, { color: colors.coral, fontWeight: '900' }]}>
              $2.99 <Text style={[typography.subhead, { color: colors.textSecondary }]}>/ month</Text>
            </Text>
          </View>
        </View>

        {/* Perks List */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: '700' }]}>
            WHAT'S INCLUDED IN MOMO+
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
          title="Upgrade to MOMO+"
          onPress={handleSubscribe}
          loading={isSubscribing}
          variant="primary"
          size="lg"
          style={{ width: '100%', marginBottom: spacing.sm }}
        />

        <MOMOButton
          title="Restore Purchases"
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
