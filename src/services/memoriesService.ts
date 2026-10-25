import AsyncStorage from '@react-native-async-storage/async-storage';
import { Moment } from '@/lib/supabase';
import { getFeedMoments } from './momentsService';

const SAVED_MEMORIES_KEY = '@momo_saved_memories';
const ALBUMS_KEY = '@momo_albums';

export interface Album {
  id: string;
  title: string;
  coverUrl: string;
  momentCount: number;
  createdAt: string;
}

const DEFAULT_ALBUMS: Album[] = [
  {
    id: 'album-1',
    title: 'Autumn Walks 🍂',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    momentCount: 8,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'album-2',
    title: 'Weekend Bakes 🥐',
    coverUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    momentCount: 14,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'album-3',
    title: 'Sunsets & Coffee ☕️',
    coverUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
    momentCount: 22,
    createdAt: new Date().toISOString(),
  },
];

export async function getMemories(userId: string): Promise<Moment[]> {
  const feed = await getFeedMoments(userId);
  const raw = await AsyncStorage.getItem(SAVED_MEMORIES_KEY);
  const savedIds: string[] = raw ? JSON.parse(raw) : [];

  // All moments created by the current user are memories, plus any explicitly saved moments
  const myMemories = feed.filter(
    (m) =>
      m.owner_id === userId ||
      m.owner?.id === userId ||
      savedIds.includes(m.id)
  );

  return myMemories.length > 0 ? myMemories : feed;
}

export async function saveMemory(momentId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(SAVED_MEMORIES_KEY);
  const current: string[] = raw ? JSON.parse(raw) : [];
  if (!current.includes(momentId)) {
    current.push(momentId);
    await AsyncStorage.setItem(SAVED_MEMORIES_KEY, JSON.stringify(current));
  }
}

export async function getAlbums(userId: string): Promise<Album[]> {
  try {
    const raw = await AsyncStorage.getItem(ALBUMS_KEY);
    if (raw) return JSON.parse(raw);
    await AsyncStorage.setItem(ALBUMS_KEY, JSON.stringify(DEFAULT_ALBUMS));
    return DEFAULT_ALBUMS;
  } catch {
    return DEFAULT_ALBUMS;
  }
}

export async function createAlbum(userId: string, title: string, coverUrl: string): Promise<Album> {
  const newAlbum: Album = {
    id: `album_${Date.now()}`,
    title,
    coverUrl,
    momentCount: 1,
    createdAt: new Date().toISOString(),
  };
  const albums = await getAlbums(userId);
  const updated = [newAlbum, ...albums];
  await AsyncStorage.setItem(ALBUMS_KEY, JSON.stringify(updated));
  return newAlbum;
}
