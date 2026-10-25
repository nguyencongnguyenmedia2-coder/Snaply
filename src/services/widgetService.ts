import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Moment } from '@/lib/supabase';

export interface WidgetSnapshotData {
  latestMomentId: string;
  imageUrl: string;
  authorName: string;
  authorUsername: string;
  caption?: string | null;
  updatedAt: string;
  deepLink: string;
}

const WIDGET_DATA_KEY = '@momo_widget_snapshot';
const WIDGET_PREFS_KEY = '@momo_widget_preferences';

export interface WidgetPreferences {
  variant: 'latest' | 'friend' | 'group' | 'memory';
  targetId?: string;
  theme: 'system' | 'light' | 'dark' | 'coral';
  photoFraming: 'fill' | 'fit' | 'rounded';
}

export const DEFAULT_WIDGET_PREFS: WidgetPreferences = {
  variant: 'latest',
  theme: 'system',
  photoFraming: 'fill',
};

export async function getWidgetPreferences(): Promise<WidgetPreferences> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_WIDGET_PREFS;
}

export async function saveWidgetPreferences(
  prefs: WidgetPreferences
): Promise<void> {
  await AsyncStorage.setItem(WIDGET_PREFS_KEY, JSON.stringify(prefs));
}

export async function updateWidgetMomentsSnapshot(
  moments: Moment[]
): Promise<void> {
  if (!moments || moments.length === 0) return;

  const latest = moments[0];
  const snapshot: WidgetSnapshotData = {
    latestMomentId: latest.id,
    imageUrl: latest.media_url,
    authorName: latest.owner?.display_name || 'Friend',
    authorUsername: latest.owner?.username || 'friend',
    caption: latest.caption,
    updatedAt: new Date().toISOString(),
    deepLink: `momo://moment/${latest.id}`,
  };

  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(snapshot));

    // If native widget bridge is available:
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const ExpoWidgets = require('expo-widgets');
        if (ExpoWidgets && typeof ExpoWidgets.setWidgetData === 'function') {
          await ExpoWidgets.setWidgetData('MOMOLatestWidget', snapshot);
        }
      } catch {
        // Native module active in custom development client
      }
    }
  } catch (err) {
    console.warn('Could not update widget snapshot:', err);
  }
}

export async function getLatestWidgetSnapshot(): Promise<WidgetSnapshotData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
