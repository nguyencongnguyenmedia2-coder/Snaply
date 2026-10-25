import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { MOMOButton, MOMOTextField } from '@/components/ui';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { signIn, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      setErrorMessage('Vui lòng nhập cả email và mật khẩu.');
      return;
    }

    setErrorMessage(null);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setErrorMessage(error.message || 'Email hoặc mật khẩu không chính xác.');
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleDemoSignIn = async () => {
    setErrorMessage(null);
    const { error } = await signIn('momo.lover@example.com', 'password123');
    if (!error) {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: spacing.xxl,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        keyboardShouldPersistTaps="handled">
        {/* Brand Icon & Heading */}
        <View style={{ alignItems: 'center', marginBottom: spacing.xxxl }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: radii.xxl,
              backgroundColor: colors.coral,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}>
            <Ionicons name="heart" size={44} color="#FFFFFF" />
          </View>
          <Text
            style={[
              typography.display,
              { color: colors.coral, fontWeight: '900', letterSpacing: -0.5 },
            ]}>
            momo
          </Text>
          <Text
            style={[
              typography.callout,
              { color: colors.textSecondary, marginTop: 4, fontWeight: '500' },
            ]}>
            Khoảnh khắc nhỏ, gắn kết hơn.
          </Text>
        </View>

        {/* Error Feedback */}
        {errorMessage && (
          <View
            style={{
              backgroundColor: colors.errorLight,
              padding: spacing.md,
              borderRadius: radii.md,
              marginBottom: spacing.md,
              borderWidth: 1,
              borderColor: colors.error,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
            <Ionicons
              name="alert-circle"
              size={20}
              color={colors.error}
              style={{ marginRight: spacing.sm }}
            />
            <Text style={[typography.subhead, { color: colors.error, flex: 1 }]}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Inputs */}
        <MOMOTextField
          label="Địa chỉ Email"
          placeholder="ban@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textSecondary} />}
        />

        <MOMOTextField
          label="Mật khẩu"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />}
        />

        <Pressable
          onPress={() => router.push('/auth/forgot-password')}
          style={{ alignSelf: 'flex-end', marginBottom: spacing.xl }}>
          <Text style={[typography.caption, { color: colors.coral, fontWeight: '700' }]}>
            Quên mật khẩu?
          </Text>
        </Pressable>

        <MOMOButton
          title="Đăng nhập"
          onPress={handleSignIn}
          loading={isLoading}
          variant="primary"
          size="lg"
          style={{ width: '100%', marginBottom: spacing.md }}
        />

        <MOMOButton
          title="Đăng nhập nhanh tài khoản mẫu"
          onPress={handleDemoSignIn}
          variant="secondary"
          size="md"
          style={{ width: '100%', marginBottom: spacing.xxl }}
        />

        {/* Sign up prompt */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Chưa có tài khoản?{' '}
          </Text>
          <Pressable onPress={() => router.push('/auth/sign-up')}>
            <Text style={[typography.body, { color: colors.coral, fontWeight: '700' }]}>
              Đăng ký ngay
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
