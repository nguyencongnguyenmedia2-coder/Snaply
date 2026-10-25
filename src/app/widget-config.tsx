import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import {
  MOMOHeader,
  MOMOButton,
  MOMOToast,
} from '@/components/ui';
import {
  getWidgetPreferences,
  saveWidgetPreferences,
  getLatestWidgetSnapshot,
  WidgetPreferences,
  WidgetSnapshotData,
} from '@/services/widgetService';
import { getFriends, getGroups } from '@/services/friendsService';
import { Profile, Group } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WidgetConfigScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii, shadows } = useTheme();
  const { user } = useAuth();

  const [prefs, setPrefs] = useState<WidgetPreferences>({
    variant: 'latest',
    theme: 'system',
    photoFraming: 'fill',
  });
  const [snapshot, setSnapshot] = useState<WidgetSnapshotData | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      const [p, snap, f, g] = await Promise.all([
        getWidgetPreferences(),
        getLatestWidgetSnapshot(),
        getFriends(user?.id || 'demo'),
        getGroups(user?.id || 'demo'),
      ]);
      setPrefs(p);
      setSnapshot(snap);
      setFriends(f);
      setGroups(g);
    }
    loadConfig();
  }, [user?.id]);

  const handleSave = async () => {
    setSaving(true);
    await saveWidgetPreferences(prefs);
    setSaving(false);
    setToastMessage('Đã lưu & đồng bộ Widget thành công ✨');
  };

  const previewImage =
    snapshot?.imageUrl ||
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80';

  const previewAuthor = snapshot?.authorName || 'Bảo Ngọc';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MOMOHeader showBack title="Widget màn hình chính" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxxl,
        }}>
        {/* Live Widget Preview Card */}
        <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: '700' },
            ]}>
            XEM TRƯỚC TRÊN MÀN HÌNH CHÍNH
          </Text>

          <View
            style={{
              width: 170,
              height: 170,
              borderRadius: 28,
              backgroundColor: prefs.theme === 'dark' ? '#1C1917' : '#FFFFFF',
              overflow: 'hidden',
              padding: 10,
              borderWidth: 1,
              borderColor: colors.border,
              ...shadows.lg,
            }}>
            <Image
              source={{ uri: previewImage }}
              style={{
                width: '100%',
                height: 110,
                borderRadius: 20,
                backgroundColor: colors.surfaceMuted,
              }}
              resizeMode={prefs.photoFraming === 'fit' ? 'contain' : 'cover'}
            />
            <View style={{ marginTop: 6 }}>
              <Text
                style={[
                  typography.caption,
                  {
                    fontWeight: '700',
                    color: prefs.theme === 'dark' ? '#FFFFFF' : colors.text,
                    fontSize: 12,
                  },
                ]}
                numberOfLines={1}>
                {previewAuthor}
              </Text>
              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.coral,
                    fontSize: 10,
                    fontWeight: '600',
                  },
                ]}>
                Khoảnh khắc nhỏ 🌸
              </Text>
            </View>
          </View>
        </View>

        {/* Variant Selector */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: '700' },
            ]}>
            NỘI DUNG HIỂN THỊ TRÊN WIDGET
          </Text>

          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}>
            {[
              { id: 'latest', title: 'Khoảnh khắc mới nhất', desc: 'Luôn cập nhật khi bất kỳ bạn thân nào chia sẻ ảnh' },
              { id: 'friend', title: 'Bạn thân cụ thể', desc: 'Cố định widget chỉ nhận ảnh từ một người bạn' },
              { id: 'group', title: 'Nhóm riêng tư', desc: 'Chỉ hiển thị ảnh được chia sẻ trong nhóm đã chọn' },
              { id: 'memory', title: 'Kỷ niệm ngẫu nhiên', desc: 'Bất ngờ gợi nhớ lại kỷ niệm ấm áp trong ngày này' },
            ].map((variantItem, idx) => {
              const isSelected = prefs.variant === variantItem.id;
              return (
                <Pressable
                  key={variantItem.id}
                  onPress={() => setPrefs({ ...prefs, variant: variantItem.id as any })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.md,
                    borderBottomWidth: idx < 3 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        typography.callout,
                        { fontWeight: '700', color: colors.text },
                      ]}>
                      {variantItem.title}
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.textSecondary, marginTop: 2 },
                      ]}>
                      {variantItem.desc}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={isSelected ? colors.coral : colors.textSecondary}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Photo Framing Selector */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: '700' },
            ]}>
            KIỂU KHUNG ẢNH
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[
              { id: 'fill', label: 'Tràn viền (Fill)' },
              { id: 'fit', label: 'Vừa vặn (Fit)' },
              { id: 'rounded', label: 'Bo tròn (Pill)' },
            ].map((frame) => {
              const isSelected = prefs.photoFraming === frame.id;
              return (
                <Pressable
                  key={frame.id}
                  onPress={() => setPrefs({ ...prefs, photoFraming: frame.id as any })}
                  style={{
                    flex: 1,
                    backgroundColor: isSelected ? colors.coralLight : colors.surface,
                    borderRadius: radii.lg,
                    paddingVertical: spacing.md,
                    alignItems: 'center',
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.coral : colors.border,
                  }}>
                  <Text
                    style={[
                      typography.callout,
                      {
                        fontWeight: '700',
                        color: isSelected ? colors.coral : colors.text,
                      },
                    ]}>
                    {frame.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Instructions banner */}
        <View
          style={{
            backgroundColor: colors.surfaceSubtle,
            borderRadius: radii.xl,
            padding: spacing.lg,
            marginBottom: spacing.xl,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <Ionicons name="information-circle-outline" size={20} color={colors.coral} style={{ marginRight: spacing.xs }} />
            <Text style={[typography.headline, { color: colors.text, fontWeight: '700' }]}>
              Cách thêm Widget MOMO lên màn hình chính
            </Text>
          </View>
          <Text style={[typography.footnote, { color: colors.textSecondary, lineHeight: 20 }]}>
            • Trên iPhone (iOS): Nhấn giữ màn hình chính, chạm dấu (+) ở góc trên, tìm "MOMO" và chọn kích cỡ widget bạn thích.{'\n'}
            • Trên Android: Nhấn giữ khoảng trống màn hình chính, chọn "Tiện ích (Widgets)", kéo khung ảnh MOMO ra màn hình.
          </Text>
        </View>

        {/* Save Changes Button */}
        <MOMOButton
          title="Lưu & Đồng bộ Widget"
          onPress={handleSave}
          loading={saving}
          variant="primary"
          size="lg"
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
