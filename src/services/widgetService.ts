import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Moment } from '@/lib/supabase';
import { MOMOWidgetSnapshot } from '@/widgets/types';
import MOMOLatestWidget from '@/widgets/MOMOLatestWidget';

export type WidgetSnapshotData = MOMOWidgetSnapshot;

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

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

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
  let snapshot: MOMOWidgetSnapshot;

  if (!moments || moments.length === 0) {
    snapshot = {
      momentId: '',
      latestMomentId: '',
      authorName: 'MOMO Friends',
      authorUsername: 'momo',
      caption: 'Waiting for new moments...',
      timeAgo: 'Just now',
      photoUrl: '',
      imageUrl: '',
      deepLink: 'momo://',
      hasUnseen: false,
      isEmpty: true,
    };
  } else {
    const latest = moments[0];
    snapshot = {
      momentId: latest.id,
      latestMomentId: latest.id,
      authorName: latest.owner?.display_name || 'Friend',
      authorUsername: latest.owner?.username || 'friend',
      caption: latest.caption || '',
      timeAgo: formatTimeAgo(latest.created_at),
      photoUrl: latest.media_url,
      imageUrl: latest.media_url,
      deepLink: `momo://moment/${latest.id}`,
      hasUnseen: false,
      isEmpty: false,
    };
  }

  try {
    // 1. Cache snapshot locally in AsyncStorage
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(snapshot));

    // 2. Transmit snapshot to isolated native widget runtime
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        MOMOLatestWidget.updateSnapshot(snapshot);
      } catch (nativeErr) {
        // Safe catch if running in Expo Go before development build is generated
        console.warn('Native widget snapshot update deferred:', nativeErr);
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
