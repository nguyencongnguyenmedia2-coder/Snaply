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
import { z } from 'zod';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { MOMOButton, MOMOTextField, MOMOHeader } from '@/components/ui';

const SignUpSchema = z.object({
  displayName: z.string().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự'),
  username: z
    .string()
    .min(3, 'Tên người dùng phải có ít nhất 3 ký tự')
    .max(20, 'Tên người dùng không được vượt quá 20 ký tự')
    .regex(/^[a-z0-9_]+$/, 'Tên người dùng chỉ gồm chữ cái thường, số và dấu gạch dưới'),
  email: z.string().email('Vui lòng nhập địa chỉ email hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { signUp, isLoading } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setErrors({});
    setGlobalError(null);

    const validation = SignUpSchema.safeParse({
      displayName: displayName.trim(),
      username: username.toLowerCase().trim(),
      email: email.trim(),
      password,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        fieldErrors[fieldName] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const { error } = await signUp(
      email.trim(),
      password,
      username.toLowerCase().trim(),
      displayName.trim()
    );

    if (error) {
      setGlobalError(error.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Tạo tài khoản" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xxl,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        keyboardShouldPersistTaps="handled">
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 22 },
          ]}>
          Tham gia MOMO và bắt đầu chia sẻ những khoảnh khắc bình yên, gần gũi với người thân yêu nhất.
        </Text>

        {globalError && (
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
              {globalError}
            </Text>
          </View>
        )}

        <MOMOTextField
          label="Tên của bạn"
          placeholder="Ví dụ: Minh Thư"
          value={displayName}
          onChangeText={setDisplayName}
          error={errors.displayName}
          leftIcon={<Ionicons name="person-outline" size={18} color={colors.textSecondary} />}
        />

        <MOMOTextField
          label="Tên người dùng (Username)"
          placeholder="Ví dụ: minh_thu"
          value={username}
          onChangeText={(val) => setUsername(val.toLowerCase())}
          autoCapitalize="none"
          error={errors.username}
          leftIcon={<Ionicons name="at" size={18} color={colors.textSecondary} />}
        />

        <MOMOTextField
          label="Địa chỉ Email"
          placeholder="ban@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textSecondary} />}
        />

        <MOMOTextField
          label="Mật khẩu"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />}
        />

        <MOMOButton
          title="Tạo tài khoản MOMO"
          onPress={handleSignUp}
          loading={isLoading}
          variant="primary"
          size="lg"
          style={{ width: '100%', marginTop: spacing.md, marginBottom: spacing.xl }}
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Đã có tài khoản?{' '}
          </Text>
          <Pressable onPress={() => router.push('/auth/sign-in')}>
            <Text style={[typography.body, { color: colors.coral, fontWeight: '700' }]}>
              Đăng nhập
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
