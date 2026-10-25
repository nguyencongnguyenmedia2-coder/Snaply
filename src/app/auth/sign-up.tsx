import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { MOMOButton, MOMOTextField, MOMOHeader, MOMOAvatar, MOMOToast } from '@/components/ui';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&auto=format&fit=crop&q=80',
];

const SignUpSchema = z
  .object({
    displayName: z.string().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự'),
    username: z
      .string()
      .min(3, 'Tên người dùng phải có ít nhất 3 ký tự')
      .max(20, 'Tên người dùng không được vượt quá 20 ký tự')
      .regex(/^[a-z0-9_]+$/, 'Tên người dùng chỉ gồm chữ cái thường, số và dấu gạch dưới'),
    email: z.string().email('Vui lòng nhập địa chỉ email hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    confirmPassword: z.string().min(6, 'Vui lòng xác nhận mật khẩu'),
    agreedToTerms: z.boolean().refine((val) => val === true, {
      message: 'Vui lòng đồng ý với Điều khoản dịch vụ để tiếp tục',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { signUp, isLoading } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string>(PRESET_AVATARS[0]);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Pick avatar error:', err);
    }
  };

  const handleSignUp = async () => {
    setErrors({});
    setGlobalError(null);

    const validation = SignUpSchema.safeParse({
      displayName: displayName.trim(),
      username: username.toLowerCase().trim(),
      email: email.trim(),
      password,
      confirmPassword,
      agreedToTerms,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    const { error, requiresEmailConfirmation } = await signUp(
      email.trim(),
      password,
      username.toLowerCase().trim(),
      displayName.trim(),
      avatarUrl
    );

    if (error) {
      setGlobalError(error.message);
    } else if (requiresEmailConfirmation) {
      setConfirmationNotice(email.trim());
    } else {
      setToastMessage('Đăng ký thành công! Chào mừng bạn đến với MOMO 🌸');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 700);
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
          paddingBottom: insets.bottom + spacing.xxxl,
        }}
        keyboardShouldPersistTaps="handled">
        {confirmationNotice ? (
          /* Email Confirmation View */
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xxl,
              padding: spacing.xl,
              alignItems: 'center',
              marginTop: spacing.xl,
              borderWidth: 1,
              borderColor: colors.border,
            }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: radii.full,
                backgroundColor: colors.coralLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
              }}>
              <Ionicons name="mail-unread" size={36} color={colors.coral} />
            </View>

            <Text
              style={[
                typography.title2,
                { color: colors.text, fontWeight: '800', textAlign: 'center', marginBottom: spacing.xs },
              ]}>
              Kích hoạt tài khoản
            </Text>

            <Text
              style={[
                typography.body,
                {
                  color: colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: 22,
                  marginBottom: spacing.xl,
                },
              ]}>
              Chúng mình đã gửi liên kết kích hoạt đến{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>{confirmationNotice}</Text>.
              Vui lòng mở email và nhấn vào liên kết để bắt đầu sử dụng MOMO.
            </Text>

            <MOMOButton
              title="Đến trang Đăng nhập"
              onPress={() => router.replace('/auth/sign-in')}
              variant="primary"
              size="lg"
              style={{ width: '100%', marginBottom: spacing.sm }}
            />
          </View>
        ) : (
          /* Sign Up Form View */
          <View>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 22 },
              ]}>
              Tham gia MOMO và bắt đầu chia sẻ những khoảnh khắc bình yên, gần gũi với người thân yêu nhất.
            </Text>

            {/* Avatar Selector */}
            <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
              <Pressable
                onPress={handlePickAvatar}
                style={{ position: 'relative', marginBottom: spacing.sm }}
                accessibilityRole="button"
                accessibilityLabel="Chọn ảnh đại diện">
                <MOMOAvatar url={avatarUrl} name={displayName || 'MOMO'} size="xl" />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    backgroundColor: colors.coral,
                    width: 28,
                    height: 28,
                    borderRadius: radii.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: colors.surface,
                  }}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </Pressable>

              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                Chạm để tải ảnh từ máy hoặc chọn avatar có sẵn:
              </Text>

              {/* Preset Avatars Row */}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                {PRESET_AVATARS.map((uri, idx) => {
                  const isSelected = avatarUrl === uri;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => setAvatarUrl(uri)}
                      style={{
                        padding: 2,
                        borderRadius: radii.full,
                        borderWidth: 2,
                        borderColor: isSelected ? colors.coral : 'transparent',
                      }}>
                      <Image
                        source={{ uri }}
                        style={{ width: 36, height: 36, borderRadius: radii.full }}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Global Error Banner */}
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

            {/* Display Name */}
            <MOMOTextField
              label="Tên của bạn"
              placeholder="Ví dụ: Minh Thư"
              value={displayName}
              onChangeText={setDisplayName}
              error={errors.displayName}
              leftIcon={<Ionicons name="person-outline" size={18} color={colors.textSecondary} />}
            />

            {/* Username */}
            <MOMOTextField
              label="Tên người dùng (Username)"
              placeholder="Ví dụ: minh_thu"
              value={username}
              onChangeText={(val) => setUsername(val.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
              error={errors.username}
              leftIcon={<Ionicons name="at" size={18} color={colors.textSecondary} />}
            />

            {/* Email */}
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

            {/* Password */}
            <MOMOTextField
              label="Mật khẩu"
              placeholder="Tối thiểu 6 ký tự"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />}
            />

            {/* Confirm Password */}
            <MOMOTextField
              label="Xác nhận mật khẩu"
              placeholder="Nhập lại mật khẩu"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} />}
            />

            {/* Terms and Privacy Checkbox */}
            <Pressable
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: spacing.sm,
              }}>
              <Ionicons
                name={agreedToTerms ? 'checkbox' : 'square-outline'}
                size={22}
                color={agreedToTerms ? colors.coral : colors.textSecondary}
                style={{ marginRight: spacing.sm }}
              />
              <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, lineHeight: 18 }]}>
                Tôi đồng ý với{' '}
                <Text style={{ color: colors.coral, fontWeight: '700' }}>Điều khoản dịch vụ</Text> và{' '}
                <Text style={{ color: colors.coral, fontWeight: '700' }}>Chính sách bảo mật</Text> của MOMO.
              </Text>
            </Pressable>
            {errors.agreedToTerms && (
              <Text style={[typography.caption, { color: colors.error, marginBottom: spacing.sm }]}>
                {errors.agreedToTerms}
              </Text>
            )}

            {/* Submit Button */}
            <MOMOButton
              title="Tạo tài khoản MOMO"
              onPress={handleSignUp}
              loading={isLoading}
              variant="primary"
              size="lg"
              style={{ width: '100%', marginTop: spacing.sm, marginBottom: spacing.xl }}
            />

            {/* Sign In Link */}
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
          </View>
        )}
      </ScrollView>

      <MOMOToast
        visible={!!toastMessage}
        message={toastMessage || ''}
        type="success"
        onDismiss={() => setToastMessage(null)}
      />
    </KeyboardAvoidingView>
  );
}
