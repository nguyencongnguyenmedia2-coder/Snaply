import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { MOMOHeader, MOMOIconButton, MOMOBottomSheet, MOMOTextField, MOMOButton } from '@/components/ui';
import { getMemories, getAlbums, createAlbum, Album } from '@/services/memoriesService';
import { Moment } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MemoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii } = useTheme();
  const { user } = useAuth();

  const [memories, setMemories] = useState<Moment[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // New album dialog
  const [newAlbumVisible, setNewAlbumVisible] = useState(false);
  const [albumTitle, setAlbumTitle] = useState('');

  const loadData = async () => {
    if (!user) return;
    try {
      const [m, a] = await Promise.all([
        getMemories(user.id),
        getAlbums(user.id),
      ]);
      setMemories(m);
      setAlbums(a);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateAlbum = async () => {
    if (!albumTitle.trim() || !user) return;
    const cover = memories[0]?.media_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600';
    await createAlbum(user.id, albumTitle.trim(), cover);
    setAlbumTitle('');
    setNewAlbumVisible(false);
    loadData();
  };

  const gridItemWidth = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / 3;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader
        title="Kỷ niệm"
        rightAction={
          <MOMOIconButton
            icon={<Ionicons name="sparkles-outline" size={20} color={colors.coral} />}
            onPress={() => router.push('/widget-config')}
            accessibilityLabel="Cài đặt Widget"
            size={38}
          />
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 80,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={colors.coral}
          />
        }>
        {/* Weekly Recap Highlight Banner */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xxl,
            padding: spacing.lg,
            marginBottom: spacing.xl,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <View style={{ flex: 1 }}>
            <View
              style={{
                backgroundColor: colors.coralLight,
                alignSelf: 'flex-start',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: radii.xs,
                marginBottom: spacing.xs,
              }}>
              <Text style={[typography.caption, { color: colors.coral, fontWeight: '700' }]}>
                ĐIỂM LẠI TUẦN NÀY
              </Text>
            </View>
            <Text style={[typography.title3, { fontWeight: '700', color: colors.text }]}>
              Khoảnh khắc tuần này
            </Text>
            <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
              {memories.length} khoảnh khắc ấm áp cùng vòng tròn bạn bè thân thiết
            </Text>
          </View>

          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radii.full,
              backgroundColor: colors.blush,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="film" size={26} color={colors.charcoal || '#292526'} />
          </View>
        </View>

        {/* Albums Section */}
        <View style={{ marginBottom: spacing.xl }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.sm,
            }}>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
              ALBUM CỦA BẠN ({albums.length})
            </Text>
            <Pressable onPress={() => setNewAlbumVisible(true)}>
              <Text style={[typography.caption, { color: colors.coral, fontWeight: '700' }]}>
                + Tạo album mới
              </Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {albums.map((album) => (
              <View
                key={album.id}
                style={{
                  width: 140,
                  marginRight: spacing.md,
                }}>
                <Image
                  source={{ uri: album.coverUrl }}
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: radii.lg,
                    backgroundColor: colors.surfaceMuted,
                  }}
                  resizeMode="cover"
                />
                <Text
                  style={[
                    typography.callout,
                    { fontWeight: '700', color: colors.text, marginTop: spacing.xs },
                  ]}
                  numberOfLines={1}>
                  {album.title}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {album.momentCount} khoảnh khắc
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Chronological Photo Grid */}
        <View>
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: '700' },
            ]}>
            TẤT CẢ KHOẢNH KHẮC THEO THỜI GIAN ({memories.length})
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {memories.map((moment) => (
              <Pressable
                key={moment.id}
                onPress={() => router.push(`/moment/${moment.id}` as any)}
                style={{
                  width: gridItemWidth,
                  height: gridItemWidth * 1.3,
                  borderRadius: radii.md,
                  overflow: 'hidden',
                  backgroundColor: colors.surfaceMuted,
                }}>
                <Image
                  source={{ uri: moment.media_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* New Album Bottom Sheet */}
      <MOMOBottomSheet
        visible={newAlbumVisible}
        onClose={() => setNewAlbumVisible(false)}
        title="Tạo album mới">
        <View style={{ paddingBottom: spacing.xl }}>
          <MOMOTextField
            label="Tên album"
            placeholder="Ví dụ: Chuyến đi mùa hè 🌊"
            value={albumTitle}
            onChangeText={setAlbumTitle}
          />
          <MOMOButton
            title="Tạo album"
            onPress={handleCreateAlbum}
            variant="primary"
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </MOMOBottomSheet>
    </View>
  );
}
