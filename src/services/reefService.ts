import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadMomentMedia, createMoment, reactToMoment, deleteMoment, getFeedMoments } from './momentsService';

export const REEF_GRADIENTS = [
  { id: 'coral', name: 'Coral Sun', colors: ['#FF5E62', '#FF9966'], textColor: '#FFFFFF' },
  { id: 'sunset', name: 'Sunset Glow', colors: ['#FA709A', '#FEE140'], textColor: '#FFFFFF' },
  { id: 'aurora', name: 'Aurora Borealis', colors: ['#43E97B', '#38F9D7'], textColor: '#102A1E' },
  { id: 'ocean', name: 'Deep Ocean', colors: ['#4FACFE', '#00F2FE'], textColor: '#FFFFFF' },
  { id: 'neon', name: 'Neon Lime', colors: ['#00F5A0', '#00D9F5'], textColor: '#0B2228' },
  { id: 'sakura', name: 'Sakura Petal', colors: ['#FF9A9E', '#FECFEF'], textColor: '#4A1525' },
  { id: 'midnight', name: 'Velvet Midnight', colors: ['#3023AE', '#C86DD7'], textColor: '#FFFFFF' },
  { id: 'dark', name: 'Obsidian Noir', colors: ['#1A1A1A', '#2E2E2E'], textColor: '#FFFFFF' },
];

export const REEF_STICKERS = ['🌸', '✨', '💖', '🔥', '☕', '⚡', '🎉', '🏖️', '🍕', '🐱'];

export interface Reef {
  id: string;
  owner_id: string;
  type: 'media' | 'text';
  media_url: string;
  content: string;
  background_gradient?: string;
  sticker?: string | null;
  privacy: 'all' | 'friends' | 'private';
  created_at: string;
  expires_at: string;
  owner: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  reactions: Record<string, number>;
  user_reaction: string | null;
}

const LOCAL_REEFS_KEY = '@snaply_active_reefs';

/**
 * Encode reef metadata safely inside standard moment caption field
 * Format: [REEF:type:gradientId:sticker] Caption content
 */
export function encodeReefCaption(content: string, type: 'media' | 'text', gradientId?: string, sticker?: string | null): string {
  const meta = `[REEF:${type}:${gradientId || 'coral'}:${sticker || 'none'}]`;
  return `${meta} ${content}`.trim();
}

/**
 * Decode reef metadata from moment caption
 */
export function decodeReefCaption(rawCaption?: string | null): {
  isReef: boolean;
  type: 'media' | 'text';
  gradientId: string;
  sticker: string | null;
  content: string;
} {
  if (!rawCaption) {
    return { isReef: false, type: 'media', gradientId: 'coral', sticker: null, content: '' };
  }

  const match = rawCaption.match(/^\[REEF:([^:]+):([^:]+):([^\]]+)\]\s*(.*)$/s);
  if (match) {
    return {
      isReef: true,
      type: (match[1] as 'media' | 'text') || 'media',
      gradientId: match[2] || 'coral',
      sticker: match[3] === 'none' ? null : match[3],
      content: match[4] || '',
    };
  }

  return { isReef: false, type: 'media', gradientId: 'coral', sticker: null, content: rawCaption };
}

/**
 * Post a new Reef (Photo, Video, or Text Story)
 */
export async function createReef(params: {
  userId: string;
  type: 'media' | 'text';
  mediaUri?: string;
  content: string;
  gradientId?: string;
  sticker?: string | null;
  privacy?: 'all' | 'friends' | 'private';
  ownerProfile?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}): Promise<Reef> {
  const { userId, type, mediaUri, content, gradientId = 'coral', sticker, privacy = 'all', ownerProfile } = params;

  // If text reef, use high-res abstract gradient SVG/image URI as media_url
  let effectiveMediaUrl = mediaUri;
  if (type === 'text' || !effectiveMediaUrl) {
    effectiveMediaUrl = `https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1080&auto=format&fit=crop&q=80&theme=${gradientId}`;
  } else {
    // Compress & upload media if it's a local uri
    effectiveMediaUrl = await uploadMomentMedia(effectiveMediaUrl, userId);
  }

  const encodedCaption = encodeReefCaption(content, type, gradientId, sticker);

  // Create as Moment in Supabase (interoperable across all feeds, widgets, and CRM)
  const moment = await createMoment({
    userId,
    mediaUri: effectiveMediaUrl,
    caption: encodedCaption,
    ownerProfile,
  });

  const reef: Reef = {
    id: moment.id,
    owner_id: userId,
    type,
    media_url: effectiveMediaUrl,
    content,
    background_gradient: gradientId,
    sticker,
    privacy,
    created_at: moment.created_at,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    owner: {
      id: userId,
      username: ownerProfile?.username || 'me',
      display_name: ownerProfile?.display_name || 'Tôi',
      avatar_url: ownerProfile?.avatar_url || null,
    },
    reactions: {},
    user_reaction: null,
  };

  // Cache locally
  const stored = await AsyncStorage.getItem(LOCAL_REEFS_KEY);
  const list: Reef[] = stored ? JSON.parse(stored) : [];
  await AsyncStorage.setItem(LOCAL_REEFS_KEY, JSON.stringify([reef, ...list]));

  return reef;
}

/**
 * Fetch all active Reefs (within 24 hours) from user and friends
 */
export async function getActiveReefs(userId: string): Promise<Reef[]> {
  try {
    const rawMoments = await getFeedMoments(userId);

    const reefs: Reef[] = [];
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const m of rawMoments) {
      const decoded = decodeReefCaption(m.caption);
      const createdAtMs = new Date(m.created_at).getTime();

      // If tagged as reef or created within 24h
      if (decoded.isReef || createdAtMs >= oneDayAgo) {
        reefs.push({
          id: m.id,
          owner_id: m.owner_id,
          type: decoded.type,
          media_url: m.media_url,
          content: decoded.content || m.caption || '',
          background_gradient: decoded.gradientId,
          sticker: decoded.sticker,
          privacy: 'friends',
          created_at: m.created_at,
          expires_at: new Date(createdAtMs + 24 * 60 * 60 * 1000).toISOString(),
          owner: {
            id: m.owner?.id || m.owner_id,
            username: m.owner?.username || 'user',
            display_name: m.owner?.display_name || 'Bạn bè',
            avatar_url: m.owner?.avatar_url || null,
          },
          reactions: m.reactions || {},
          user_reaction: m.user_reaction || null,
        });
      }
    }

    if (reefs.length > 0) {
      await AsyncStorage.setItem(LOCAL_REEFS_KEY, JSON.stringify(reefs));
      return reefs;
    }

    const stored = await AsyncStorage.getItem(LOCAL_REEFS_KEY);
    if (stored) return JSON.parse(stored);
    return [];
  } catch (err) {
    console.warn('[reefService] getActiveReefs error:', err);
    return [];
  }
}

/**
 * React to a Reef with instant emoji
 */
export async function reactToReef(reefId: string, emoji: string, userId: string): Promise<void> {
  await reactToMoment(reefId, emoji, userId);
}

/**
 * Delete a Reef
 */
export async function deleteReefItem(reefId: string, userId: string): Promise<void> {
  await deleteMoment(reefId, userId);
  const stored = await AsyncStorage.getItem(LOCAL_REEFS_KEY);
  if (stored) {
    const list: Reef[] = JSON.parse(stored);
    const updated = list.filter((r) => r.id !== reefId);
    await AsyncStorage.setItem(LOCAL_REEFS_KEY, JSON.stringify(updated));
  }
}
