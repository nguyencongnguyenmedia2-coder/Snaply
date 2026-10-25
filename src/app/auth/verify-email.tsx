import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { MOMOHeader, MOMOButton } from '@/components/ui';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Verify Email" />

      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: spacing.xxl,
          paddingTop: spacing.xxxl,
          paddingBottom: insets.bottom + spacing.xl,
        }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: radii.full,
            backgroundColor: colors.coralLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}>
          <Ionicons name="mail" size={40} color={colors.coral} />
        </View>

        <Text
          style={[
            typography.title2,
            { color: colors.text, fontWeight: '800', textAlign: 'center', marginBottom: spacing.xs },
          ]}>
          Verification Sent!
        </Text>

        <Text
          style={[
            typography.body,
            {
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: spacing.xxxl,
            },
          ]}>
          Please check your email and click the confirmation link to activate your MOMO account.
        </Text>

        <MOMOButton
          title="Proceed to Sign In"
          onPress={() => router.replace('/auth/sign-in')}
          variant="primary"
          size="lg"
          style={{ width: '100%', marginBottom: spacing.md }}
        />
      </ScrollView>
    </View>
  );
}
