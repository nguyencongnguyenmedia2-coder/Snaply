import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const PUSH_TOKEN_KEY = '@momo_push_token';
const NOTIF_PREFS_KEY = '@momo_notification_preferences';

export interface NotificationPreferences {
  newMoments: boolean;
  reactions: boolean;
  friendRequests: boolean;
  replies: boolean;
}

export const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  newMoments: true,
  reactions: true,
  friendRequests: true,
  replies: true,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldPresentBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(userId?: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    if (isSupabaseConfigured && userId) {
      await supabase.from('device_tokens').upsert({
        user_id: userId,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      });
    }

    return token;
  } catch (err) {
    console.warn('Failed to get push token:', err);
    return null;
  }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_NOTIF_PREFS;
}

export async function saveNotificationPreferences(
  prefs: NotificationPreferences
): Promise<void> {
  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
}
