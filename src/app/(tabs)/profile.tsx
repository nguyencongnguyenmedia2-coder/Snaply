import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import {
  MOMOHeader,
  MOMOAvatar,
  MOMOButton,
  MOMOBottomSheet,
  MOMOTextField,
  MOMOToast,
} from '@/components/ui';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { user, profile, updateProfile, signOut } = useAuth();

  const [editVisible, setEditVisible] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(profile?.display_name || '');
  const [bioInput, setBioInput] = useState(profile?.bio || '');
  const [updating, setUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        await updateProfile({ avatar_url: result.assets[0].uri });
        setToastMessage('Profile photo updated ✨');
      }
    } catch (err) {
      console.warn('Avatar update failed:', err);
    }
  };

  const handleSaveProfile = async () => {
    setUpdating(true);
    await updateProfile({
      display_name: displayNameInput,
      bio: bioInput,
    });
    setUpdating(false);
    setEditVisible(false);
    setToastMessage('Profile details saved.');
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of MOMO?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth/sign-in');
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader
        title="My Profile"
        rightAction={
          <Pressable
            onPress={() => {
              setDisplayNameInput(profile?.display_name || '');
              setBioInput(profile?.bio || '');
              setEditVisible(true);
            }}
            hitSlop={10}>
            <Text style={[typography.callout, { color: colors.coral, fontWeight: '700' }]}>
              Edit
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}>
        {/* Profile Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xxl,
            padding: spacing.xl,
            alignItems: 'center',
            marginBottom: spacing.lg,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <Pressable
            onPress={handlePickAvatar}
            style={{ position: 'relative', marginBottom: spacing.md }}
            accessibilityRole="button"
            accessibilityLabel="Change profile avatar">
            <MOMOAvatar
              url={profile?.avatar_url}
              name={profile?.display_name}
              size="xl"
            />
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

          <Text style={[typography.title2, { fontWeight: '800', color: colors.text }]}>
            {profile?.display_name || 'Momo Friend'}
          </Text>
          <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: 2 }]}>
            @{profile?.username || 'user'}
          </Text>

          {profile?.bio && (
            <Text
              style={[
                typography.body,
                { color: colors.text, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
              ]}>
              {profile.bio}
            </Text>
          )}

          {/* Stats Bar */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              width: '100%',
              marginTop: spacing.xl,
              paddingTop: spacing.lg,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.title3, { fontWeight: '800', color: colors.coral }]}>
                18
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Moments</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.title3, { fontWeight: '800', color: colors.coral }]}>
                12
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Close Friends</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.title3, { fontWeight: '800', color: colors.coral }]}>
                3
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Circles</Text>
            </View>
          </View>
        </View>

        {/* Home Screen Widget Promo Banner */}
        <Pressable
          onPress={() => router.push('/widget-config')}
          style={{
            backgroundColor: colors.coralLight,
            borderRadius: radii.xl,
            padding: spacing.lg,
            marginBottom: spacing.lg,
            borderWidth: 1,
            borderColor: colors.coral,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radii.lg,
              backgroundColor: colors.coral,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.md,
            }}>
            <Ionicons name="sparkles" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.headline, { color: colors.coralDark, fontWeight: '700' }]}>
              Home-Screen Widget
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Display your friends' latest real-time moments directly on your phone's home screen
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.coral} />
        </Pressable>

        {/* Settings Menu List */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.xl,
          }}>
          <Pressable
            onPress={() => router.push('/settings/privacy')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.text} style={{ marginRight: spacing.md }} />
            <Text style={[typography.callout, { flex: 1, color: colors.text, fontWeight: '600' }]}>
              Privacy & Permissions
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/settings/subscription')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
            <Ionicons name="diamond-outline" size={20} color={colors.coral} style={{ marginRight: spacing.md }} />
            <Text style={[typography.callout, { flex: 1, color: colors.text, fontWeight: '600' }]}>
              MOMO+ Premium
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/settings/storage')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
            <Ionicons name="cloud-outline" size={20} color={colors.text} style={{ marginRight: spacing.md }} />
            <Text style={[typography.callout, { flex: 1, color: colors.text, fontWeight: '600' }]}>
              Media Storage & Cache
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/settings/support')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
            }}>
            <Ionicons name="help-buoy-outline" size={20} color={colors.text} style={{ marginRight: spacing.md }} />
            <Text style={[typography.callout, { flex: 1, color: colors.text, fontWeight: '600' }]}>
              Help & Support
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Sign Out Button */}
        <MOMOButton
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          size="md"
          style={{ width: '100%', borderColor: colors.error }}
          textStyle={{ color: colors.error }}
        />
      </ScrollView>

      {/* Edit Profile Bottom Sheet */}
      <MOMOBottomSheet
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        title="Edit Profile">
        <View style={{ paddingBottom: spacing.xl }}>
          <MOMOTextField
            label="Display Name"
            value={displayNameInput}
            onChangeText={setDisplayNameInput}
          />
          <MOMOTextField
            label="Bio"
            value={bioInput}
            onChangeText={setBioInput}
            multiline
            numberOfLines={2}
          />
          <MOMOButton
            title="Save Changes"
            onPress={handleSaveProfile}
            loading={updating}
            variant="primary"
            size="lg"
            style={{ marginTop: spacing.md }}
          />
        </View>
      </MOMOBottomSheet>

      <MOMOToast
        visible={!!toastMessage}
        message={toastMessage || ''}
        type="success"
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
}
