import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MOMOHeader, MOMOTextField, MOMOButton, MOMOToast } from '@/components/ui';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your account email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSupabaseConfigured) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: 'momo://auth/reset-password' }
        );
        if (resetErr) throw resetErr;
      }
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Reset Password" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xxl,
          paddingTop: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        }}>
        {sent ? (
          <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: radii.full,
                backgroundColor: colors.successLight || '#EDF8EE',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}>
              <Ionicons name="checkmark-done" size={36} color={colors.success} />
            </View>

            <Text
              style={[
                typography.title2,
                { color: colors.text, fontWeight: '800', textAlign: 'center', marginBottom: spacing.xs },
              ]}>
              Check Your Inbox
            </Text>

            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xxl },
              ]}>
              We sent a password recovery link to {email}. Follow the instructions to reset your password.
            </Text>

            <MOMOButton
              title="Back to Sign In"
              onPress={() => router.replace('/auth/sign-in')}
              variant="primary"
              size="lg"
              style={{ width: '100%' }}
            />
          </View>
        ) : (
          <View>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 22 },
              ]}>
              Enter the email address associated with your MOMO account. We'll send you a secure link to reset your password.
            </Text>

            <MOMOTextField
              label="Email Address"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={error || undefined}
              leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textSecondary} />}
            />

            <MOMOButton
              title="Send Recovery Link"
              onPress={handleResetPassword}
              loading={loading}
              variant="primary"
              size="lg"
              style={{ width: '100%', marginTop: spacing.md }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
