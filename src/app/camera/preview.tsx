import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  Pressable,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { MOMOButton, MOMOIconButton, MOMOBottomSheet, MOMOAvatar } from '@/components/ui';
import { createMoment } from '@/services/momentsService';
import { getFriends, getGroups } from '@/services/friendsService';
import { Profile, Group } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLOR_FILTERS = [
  { id: 'natural', name: 'Natural', tint: 'transparent' },
  { id: 'warm', name: 'Warm Cream', tint: 'rgba(255, 240, 220, 0.15)' },
  { id: 'blush', name: 'Blush Dream', tint: 'rgba(245, 200, 215, 0.18)' },
  { id: 'sage', name: 'Sage Film', tint: 'rgba(184, 201, 181, 0.18)' },
];

export default function CameraPreviewScreen() {
  const router = useRouter();
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { user, profile } = useAuth();

  const [caption, setCaption] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('natural');
  const [isUploading, setIsUploading] = useState(false);

  // Recipient selection
  const [friends, setFriends] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    async function loadAudiences() {
      if (user?.id) {
        const [f, g] = await Promise.all([
          getFriends(user.id),
          getGroups(user.id),
        ]);
        setFriends(f);
        setGroups(g);
      }
    }
    loadAudiences();
  }, [user?.id]);

  const toggleRecipient = (id: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleShare = async () => {
    if (!uri || !user) return;

    try {
      setIsUploading(true);
      await createMoment({
        userId: user.id,
        mediaUri: uri,
        caption,
        groupId: selectedGroupId || undefined,
        recipientIds: selectedRecipients.length > 0 ? selectedRecipients : undefined,
        ownerProfile: profile
          ? {
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
            }
          : undefined,
      });

      router.replace('/(tabs)');
    } catch (err) {
      console.warn('Share error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const activeTint = COLOR_FILTERS.find((f) => f.id === selectedFilter)?.tint || 'transparent';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Math.max(insets.top, 14),
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <MOMOIconButton
          icon={<Ionicons name="close" size={24} color={colors.text} />}
          onPress={() => router.back()}
          accessibilityLabel="Discard"
          size={40}
        />

        <Text style={[typography.title3, { fontWeight: '700', color: colors.text }]}>
          New Moment
        </Text>

        <Pressable
          onPress={() => setSheetVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: radii.full,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <Ionicons name="people-outline" size={16} color={colors.coral} />
          <Text
            style={[
              typography.caption,
              { fontWeight: '700', color: colors.coral, marginLeft: 4 },
            ]}>
            {selectedGroupId
              ? groups.find((g) => g.id === selectedGroupId)?.name || 'Group'
              : selectedRecipients.length > 0
              ? `${selectedRecipients.length} friends`
              : 'All Friends'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}>
        {/* Photo with active filter */}
        <View
          style={{
            position: 'relative',
            borderRadius: radii.xl,
            overflow: 'hidden',
            marginVertical: spacing.md,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <Image
            source={{ uri }}
            style={{
              width: '100%',
              height: SCREEN_WIDTH * 1.25,
              backgroundColor: colors.surfaceMuted,
            }}
            resizeMode="cover"
          />
          {activeTint !== 'transparent' && (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: activeTint },
              ]}
            />
          )}
        </View>

        {/* Filter Selection Chips */}
        <View style={{ marginBottom: spacing.md }}>
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' },
            ]}>
            WARM PASTEL FILTERS
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {COLOR_FILTERS.map((filter) => {
              const isSelected = selectedFilter === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  onPress={() => setSelectedFilter(filter.id)}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs + 2,
                    borderRadius: radii.full,
                    backgroundColor: isSelected ? colors.coral : colors.surface,
                    marginRight: spacing.sm,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.coral : colors.border,
                  }}>
                  <Text
                    style={[
                      typography.caption,
                      {
                        fontWeight: '700',
                        color: isSelected ? '#FFFFFF' : colors.text,
                      },
                    ]}>
                    {filter.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Caption Field */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
            marginBottom: spacing.xl,
          }}>
          <TextInput
            placeholder="Add a sweet caption for your friends..."
            placeholderTextColor={colors.textSecondary + '99'}
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={3}
            style={[
              typography.body,
              { color: colors.text, minHeight: 60, textAlignVertical: 'top' },
            ]}
          />
        </View>

        {/* Share Button */}
        <MOMOButton
          title={isUploading ? 'Sharing to Friends & Widgets...' : 'Share Moment ✨'}
          onPress={handleShare}
          loading={isUploading}
          variant="primary"
          size="lg"
          style={{ width: '100%' }}
        />
      </ScrollView>

      {/* Recipient Selection Bottom Sheet */}
      <MOMOBottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Who Can See This Moment?">
        <View style={{ paddingBottom: spacing.xl }}>
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: '700' },
            ]}>
            AUDIENCE PRESETS
          </Text>

          <Pressable
            onPress={() => {
              setSelectedGroupId(null);
              setSelectedRecipients([]);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radii.full,
                backgroundColor: colors.coralLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
              }}>
              <Ionicons name="earth" size={20} color={colors.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.headline, { color: colors.text }]}>All Friends</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Visible to everyone in your intimate circle
              </Text>
            </View>
            {!selectedGroupId && selectedRecipients.length === 0 && (
              <Ionicons name="checkmark-circle" size={24} color={colors.coral} />
            )}
          </Pressable>

          {/* Groups */}
          {groups.map((group) => {
            const isGroupSelected = selectedGroupId === group.id;
            return (
              <Pressable
                key={group.id}
                onPress={() => {
                  setSelectedGroupId(group.id);
                  setSelectedRecipients([]);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.md,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.full,
                    backgroundColor: colors.sageLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: spacing.md,
                  }}>
                  <Ionicons name="people" size={18} color={colors.sage} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.headline, { color: colors.text }]}>{group.name}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Private group ({group.member_count || 1} members)
                  </Text>
                </View>
                {isGroupSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.coral} />
                )}
              </Pressable>
            );
          })}

          {/* Individual Friends */}
          <Text
            style={[
              typography.caption,
              {
                color: colors.textSecondary,
                marginTop: spacing.lg,
                marginBottom: spacing.sm,
                fontWeight: '700',
              },
            ]}>
            OR SELECT SPECIFIC FRIENDS
          </Text>

          {friends.map((friend) => {
            const isSelected = selectedRecipients.includes(friend.id);
            return (
              <Pressable
                key={friend.id}
                onPress={() => {
                  setSelectedGroupId(null);
                  toggleRecipient(friend.id);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.sm,
                }}>
                <MOMOAvatar url={friend.avatar_url} name={friend.display_name} size="sm" />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[typography.callout, { color: colors.text, fontWeight: '600' }]}>
                    {friend.display_name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    @{friend.username}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.coral} />
                )}
              </Pressable>
            );
          })}

          <MOMOButton
            title="Done"
            onPress={() => setSheetVisible(false)}
            variant="primary"
            size="md"
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </MOMOBottomSheet>
    </View>
  );
}
