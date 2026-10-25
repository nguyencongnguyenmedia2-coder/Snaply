import React, { useState, useEffect, useCallback } from 'react';
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
import { uploadMomentMedia } from '@/services/momentsService';
import { getFriends, getGroups } from '@/services/friendsService';
import { getActiveReefs, Reef } from '@/services/reefService';
import { ReefViewerModal } from '@/components/reef/ReefViewerModal';

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

  // Real stats
  const [friendsCount, setFriendsCount] = useState(0);
  const [groupsCount, setGroupsCount] = useState(0);
  const [myReefs, setMyReefs] = useState<Reef[]>([]);
  const [reefViewerVisible, setReefViewerVisible] = useState(false);

  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const [friends, groups, reefs] = await Promise.all([
        getFriends(user.id),
        getGroups(user.id),
        getActiveReefs(user.id),
      ]);
      setFriendsCount(friends.length);
      setGroupsCount(groups.length);
      // Filter only my own reefs
      setMyReefs(reefs.filter((r) => r.owner_id === user.id));
    } catch (err) {
      console.warn('Profile stats load error:', err);
    }
  }, [user]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setToastMessage('Đang tải ảnh đại diện lên...');
        const localUri = result.assets[0].uri;
        const uploadedUrl = user ? await uploadMomentMedia(localUri, user.id) : localUri;
        await updateProfile({ avatar_url: uploadedUrl });
        setToastMessage('Đã cập nhật ảnh đại diện ✨');
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
    setToastMessage('Đã lưu thông tin hồ sơ ✨');
  };

  const handleSignOut = async () => {
    const doLogout = async () => {
      try {
        await signOut();
        router.replace('/auth/sign-in');
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi Snaply?') : true;
      if (confirmed) {
        await doLogout();
      }
      return;
    }

    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi Snaply?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: doLogout,
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader
        title="Hồ sơ cá nhân"
        rightAction={
          <Pressable
            onPress={() => {
              setDisplayNameInput(profile?.display_name || '');
              setBioInput(profile?.bio || '');
              setEditVisible(true);
            }}
            hitSlop={10}>
            <Text style={[typography.callout, { color: colors.coral, fontWeight: '700' }]}>
              Sửa
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}>
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
            accessibilityLabel="Đổi ảnh đại diện">
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
            {profile?.display_name || 'Bạn bè MOMO'}
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
            {/* My Reefs / Stories */}
            <Pressable
              style={{ alignItems: 'center' }}
              onPress={() => {
                if (myReefs.length > 0) setReefViewerVisible(true);
                else router.push('/reef/create');
              }}
              accessibilityRole="button"
              accessibilityLabel="Tin Reef của tôi">
              <Text style={[typography.title3, { fontWeight: '800', color: colors.coral }]}>
                {myReefs.length > 0 ? `${myReefs.length} 📸` : '+'}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Tin Reef</Text>
            </Pressable>

            <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />

            <Pressable
              style={{ alignItems: 'center' }}
              onPress={() => router.push('/(tabs)/friends')}
              accessibilityRole="button"
              accessibilityLabel="Bạn thân">
              <Text style={[typography.title3, { fontWeight: '800', color: colors.coral }]}>
                {friendsCount}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Bạn thân</Text>
            </Pressable>

            <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />

            <View style={{ alignItems: 'center' }}>
              <Text style={[typography.title3, { fontWeight: '800', color: colors.coral }]}>
                {groupsCount}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Nhóm riêng</Text>
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
              Widget màn hình chính
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Hiển thị ảnh mới nhất của bạn bè trực tiếp trên màn hình chính điện thoại
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
              Quyền riêng tư & Bảo mật
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
              MOMO+ Cao cấp
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
              Dung lượng & Dữ liệu bộ nhớ
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
              Trợ giúp & Hỗ trợ
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Sign Out Button */}
        <MOMOButton
          title="Đăng xuất"
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
        title="Chỉnh sửa hồ sơ">
        <View style={{ paddingBottom: spacing.xl }}>
          <MOMOTextField
            label="Tên hiển thị"
            value={displayNameInput}
            onChangeText={setDisplayNameInput}
          />
          <MOMOTextField
            label="Tiểu sử"
            value={bioInput}
            onChangeText={setBioInput}
            multiline
            numberOfLines={2}
          />
          <MOMOButton
            title="Lưu thay đổi"
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

      <ReefViewerModal
        visible={reefViewerVisible}
        reefs={myReefs}
        onClose={() => setReefViewerVisible(false)}
      />
    </View>
  );
}
