import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getFriendRequests } from '@/services/friendsService';

export default function TabsLayout() {
  const { colors, radii, shadows } = useTheme();
  const { user } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    getFriendRequests(user.id).then((reqs) => {
      setPendingRequestsCount(reqs.length);
    }).catch(() => {});
  }, [user]);

  const handleTabPress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          ...shadows.sm,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        listeners={{ tabPress: handleTabPress }}
        options={{
          title: 'Khoảnh khắc',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={24}
              color={color as string}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="friends"
        listeners={{ tabPress: handleTabPress }}
        options={{
          title: 'Bạn bè',
          tabBarBadge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.coral,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '700',
            minWidth: 18,
            height: 18,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={24}
              color={color as string}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="camera"
        listeners={{ tabPress: handleTabPress }}
        options={{
          title: '',
          tabBarStyle: { display: 'none' },
          tabBarIcon: () => (
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: radii.full,
                backgroundColor: colors.coral,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: -18,
                borderWidth: 4,
                borderColor: colors.surface,
                ...shadows.md,
              }}>
              <Ionicons name="camera" size={26} color="#FFFFFF" />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="memories"
        listeners={{ tabPress: handleTabPress }}
        options={{
          title: 'Kỷ niệm',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'images' : 'images-outline'}
              size={24}
              color={color as string}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        listeners={{ tabPress: handleTabPress }}
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
