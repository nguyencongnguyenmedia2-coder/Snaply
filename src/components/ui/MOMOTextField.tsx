import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  ViewStyle,
  TextInputProps,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

export interface MOMOTextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const MOMOTextField: React.FC<MOMOTextFieldProps> = ({
  label,
  error,
  leftIcon,
  containerStyle,
  secureTextEntry,
  value,
  onChangeText,
  placeholder,
  ...rest
}) => {
  const { colors, typography, radii, spacing } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label && (
        <Text
          style={[
            typography.subhead,
            {
              color: colors.textSecondary,
              marginBottom: spacing.xs,
              fontWeight: '600',
            },
          ]}>
          {label}
        </Text>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radii.md,
          borderWidth: 1.5,
          borderColor: error
            ? colors.error
            : isFocused
            ? colors.coral
            : colors.border,
          paddingHorizontal: spacing.md,
          minHeight: 50,
        }}>
        {leftIcon && (
          <View style={{ marginRight: spacing.sm }}>{leftIcon}</View>
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary + '99'}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            typography.body,
            {
              flex: 1,
              color: colors.text,
              paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
            },
          ]}
          {...rest}
        />

        {secureTextEntry && (
          <Pressable
            onPress={() => setIsSecure(!isSecure)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isSecure ? 'Show password' : 'Hide password'}>
            <Ionicons
              name={isSecure ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        )}

        {!secureTextEntry && !!value && (
          <Pressable
            onPress={() => onChangeText?.('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear text">
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.textSecondary + '77'}
            />
          </Pressable>
        )}
      </View>

      {error && (
        <Text
          style={[
            typography.caption,
            {
              color: colors.error,
              marginTop: spacing.xs,
              marginLeft: spacing.xs,
            },
          ]}>
          {error}
        </Text>
      )}
    </View>
  );
};
