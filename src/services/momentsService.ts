import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured, Moment } from '@/lib/supabase';
import { updateWidgetMomentsSnapshot } from '@/services/widgetService';

const LOCAL_MOMENTS_KEY = '@momo_local_moments';

const INITIAL_MOMENTS: Moment[] = [
  {
    id: 'moment-1',
    owner_id: 'friend-sarah',
    caption: 'Golden hour in the garden with the little one 🌸',
    media_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    group_name: 'Besties',
    reactions: { '❤️': 3, '✨': 2 },
    user_reaction: '❤️',
    owner: {
      id: 'friend-sarah',
      username: 'sarah_m',
      display_name: 'Sarah Miller',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'moment-2',
    owner_id: 'friend-leo',
    caption: 'Morning brew overlooking the misty hills ☕️⛰️',
    media_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    group_name: null,
    reactions: { '🔥': 4, '👏': 1 },
    user_reaction: null,
    owner: {
      id: 'friend-leo',
      username: 'leo_explores',
      display_name: 'Leo Chen',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'moment-3',
    owner_id: 'friend-maya',
    caption: 'Baked fresh cinnamon brioche buns for Sunday brunch! 🥐',
    media_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    group_name: 'Foodies',
    reactions: { '🥺': 5, '❤️': 8 },
    user_reaction: '❤️',
    owner: {
      id: 'friend-maya',
      username: 'maya_bakes',
      display_name: 'Maya Tanaka',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    },
  },
];

export async function getFeedMoments(userId?: string): Promise<Moment[]> {
  try {
    if (isSupabaseConfigured && userId) {
      // Query moments through authorized recipients or owned moments
      const { data, error } = await supabase
        .from('moments')
        .select(`
          id,
          owner_id,
          caption,
          media_url,
          created_at,
          group_id,
          groups (name),
          profiles:owner_id (id, username, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      if (data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          owner_id: item.owner_id,
          caption: item.caption,
          media_url: item.media_url,
          created_at: item.created_at,
          group_id: item.group_id,
          group_name: item.groups?.name || null,
          owner: item.profiles,
          reactions: {},
          user_reaction: null,
        }));
      }
    }

    // Local / fallback store
    const stored = await AsyncStorage.getItem(LOCAL_MOMENTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    } else {
      await AsyncStorage.setItem(LOCAL_MOMENTS_KEY, JSON.stringify(INITIAL_MOMENTS));
      return INITIAL_MOMENTS;
    }
  } catch (err) {
    console.warn('Error fetching feed moments:', err);
    return INITIAL_MOMENTS;
  }
}

export async function uploadMomentMedia(
  uri: string,
  userId: string
): Promise<string> {
  if (!isSupabaseConfigured) {
    // Return local uri or persistent path in development/mock mode
    return uri;
  }

  try {
    const filename = `${userId}/${Date.now()}.jpg`;
    const response = await fetch(uri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('moments')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;

    // Get public / signed URL
    const { data: urlData } = supabase.storage
      .from('moments')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.warn('Storage upload failed, falling back to local uri:', err);
    return uri;
  }
}

export async function createMoment(params: {
  userId: string;
  mediaUri: string;
  caption?: string;
  groupId?: string;
  recipientIds?: string[];
  ownerProfile?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}): Promise<Moment> {
  const uploadedUrl = await uploadMomentMedia(params.mediaUri, params.userId);

  const newMoment: Moment = {
    id: `moment_${Date.now()}`,
    owner_id: params.userId,
    caption: params.caption || null,
    media_url: uploadedUrl,
    created_at: new Date().toISOString(),
    group_id: params.groupId || null,
    group_name: params.groupId ? 'Private Group' : null,
    reactions: {},
    user_reaction: null,
    owner: {
      id: params.userId,
      username: params.ownerProfile?.username || 'me',
      display_name: params.ownerProfile?.display_name || 'Me',
      avatar_url: params.ownerProfile?.avatar_url || null,
    },
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('moments')
      .insert({
        owner_id: params.userId,
        caption: params.caption,
        media_url: uploadedUrl,
        group_id: params.groupId || null,
      })
      .select()
      .single();

    if (!error && data) {
      newMoment.id = data.id;

      // Insert recipients if specified
      if (params.recipientIds && params.recipientIds.length > 0) {
        const recipientsPayload = params.recipientIds.map((recId) => ({
          moment_id: data.id,
          recipient_id: recId,
        }));
        await supabase.from('moment_recipients').insert(recipientsPayload);
      }
    }
  }

  // Update local storage
  const existing = await getFeedMoments(params.userId);
  const updated = [newMoment, ...existing];
  await AsyncStorage.setItem(LOCAL_MOMENTS_KEY, JSON.stringify(updated));

  // Trigger widget snapshot refresh with latest shared photo!
  updateWidgetMomentsSnapshot(updated).catch(() => {});

  return newMoment;
}

export async function reactToMoment(
  momentId: string,
  emoji: string,
  userId: string
): Promise<{ reactions: Record<string, number>; userReaction: string | null }> {
  const moments = await getFeedMoments(userId);
  const target = moments.find((m) => m.id === momentId);

  let newReactions = { ...(target?.reactions || {}) };
  let newUserReaction: string | null = emoji;

  if (target?.user_reaction === emoji) {
    // Toggle off
    newReactions[emoji] = Math.max(0, (newReactions[emoji] || 1) - 1);
    newUserReaction = null;
  } else {
    // Decrement previous if existed
    if (target?.user_reaction && newReactions[target.user_reaction]) {
      newReactions[target.user_reaction] = Math.max(
        0,
        newReactions[target.user_reaction] - 1
      );
    }
    newReactions[emoji] = (newReactions[emoji] || 0) + 1;
  }

  const updatedMoments = moments.map((m) =>
    m.id === momentId
      ? { ...m, reactions: newReactions, user_reaction: newUserReaction }
      : m
  );

  await AsyncStorage.setItem(LOCAL_MOMENTS_KEY, JSON.stringify(updatedMoments));

  if (isSupabaseConfigured) {
    try {
      if (newUserReaction) {
        await supabase.from('reactions').upsert({
          moment_id: momentId,
          user_id: userId,
          emoji,
        });
      } else {
        await supabase
          .from('reactions')
          .delete()
          .eq('moment_id', momentId)
          .eq('user_id', userId);
      }
    } catch (err) {
      console.warn('Failed to sync reaction with Supabase:', err);
    }
  }

  return { reactions: newReactions, userReaction: newUserReaction };
}

export async function deleteMoment(momentId: string, userId: string): Promise<boolean> {
  const moments = await getFeedMoments(userId);
  const filtered = moments.filter((m) => m.id !== momentId);
  await AsyncStorage.setItem(LOCAL_MOMENTS_KEY, JSON.stringify(filtered));

  if (isSupabaseConfigured) {
    await supabase.from('moments').delete().eq('id', momentId).eq('owner_id', userId);
  }

  updateWidgetMomentsSnapshot(filtered).catch(() => {});
  return true;
}
