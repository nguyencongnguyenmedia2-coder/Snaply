import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

export interface MOMOBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const MOMOBottomSheet: React.FC<MOMOBottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  containerStyle,
}) => {
  const { colors, radii, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          onPress={onClose}
          accessibilityLabel="Dismiss modal backdrop"
        />

        <View
          style={[
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xxl,
              borderTopRightRadius: radii.xxl,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              maxHeight: '85%',
              width: '100%',
            },
            containerStyle,
          ]}>
          {/* Grab Handle */}
          <View style={{ alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs }}>
            <View
              style={{
                width: 40,
                height: 5,
                borderRadius: radii.full,
                backgroundColor: colors.border,
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.xl,
              paddingVertical: spacing.sm,
              borderBottomWidth: title ? 1 : 0,
              borderBottomColor: colors.border,
            }}>
            {title ? (
              <Text style={[typography.title3, { color: colors.text, fontWeight: '700' }]}>
                {title}
              </Text>
            ) : (
              <View />
            )}

            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close sheet">
              <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.md,
            }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
