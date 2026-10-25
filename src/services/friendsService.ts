import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured, Profile, FriendRequest, Group } from '@/lib/supabase';

const LOCAL_FRIENDS_KEY = '@momo_friends';
const LOCAL_REQUESTS_KEY = '@momo_friend_requests';
const LOCAL_GROUPS_KEY = '@momo_groups';

const DEFAULT_FRIENDS: Profile[] = [
  {
    id: 'friend-sarah',
    username: 'sarah_m',
    display_name: 'Sarah Miller',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    bio: 'Golden hours & warm matcha 🍵',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'friend-leo',
    username: 'leo_explores',
    display_name: 'Leo Chen',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    bio: 'Chasing sunrises with a 35mm 📷',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'friend-maya',
    username: 'maya_bakes',
    display_name: 'Maya Tanaka',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    bio: 'Bread artisan & sunset seeker 🥐',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_GROUPS: Group[] = [
  {
    id: 'group-1',
    name: 'Besties',
    avatar_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&auto=format&fit=crop&q=80',
    owner_id: 'demo-user-1234',
    created_at: new Date().toISOString(),
    member_count: 4,
  },
  {
    id: 'group-2',
    name: 'Sunday Coffee Club',
    avatar_url: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400&auto=format&fit=crop&q=80',
    owner_id: 'friend-sarah',
    created_at: new Date().toISOString(),
    member_count: 3,
  },
];

export async function getFriends(userId: string): Promise<Profile[]> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          friend_id,
          profiles:friend_id (id, username, display_name, avatar_url, bio, created_at, updated_at)
        `)
        .eq('user_id', userId);

      if (!error && data && data.length > 0) {
        return data.map((item: any) => item.profiles);
      }
    }

    const stored = await AsyncStorage.getItem(LOCAL_FRIENDS_KEY);
    if (stored) return JSON.parse(stored);
    await AsyncStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(DEFAULT_FRIENDS));
    return DEFAULT_FRIENDS;
  } catch {
    return DEFAULT_FRIENDS;
  }
}

export async function getFriendRequests(userId: string): Promise<FriendRequest[]> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          id, sender_id, receiver_id, status, created_at,
          sender:sender_id (id, username, display_name, avatar_url)
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending');

      if (!error && data) return data as unknown as FriendRequest[];
    }

    const stored = await AsyncStorage.getItem(LOCAL_REQUESTS_KEY);
    if (stored) return JSON.parse(stored);
    return [
      {
        id: 'req-1',
        sender_id: 'user-elena',
        receiver_id: userId,
        status: 'pending',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        sender: {
          id: 'user-elena',
          username: 'elena_v',
          display_name: 'Elena Vance',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
          bio: 'Film and memories 🎞️',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    ];
  } catch {
    return [];
  }
}

export async function sendFriendRequest(
  senderId: string,
  targetUsername: string
): Promise<{ error: Error | null }> {
  try {
    if (isSupabaseConfigured) {
      const { data: targetUser, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', targetUsername.toLowerCase().trim())
        .single();

      if (findError || !targetUser) {
        return { error: new Error('User not found with this username') };
      }

      const { error: reqError } = await supabase.from('friend_requests').insert({
        sender_id: senderId,
        receiver_id: targetUser.id,
        status: 'pending',
      });

      if (reqError) return { error: reqError };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

export async function acceptFriendRequest(
  requestId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    if (isSupabaseConfigured) {
      const { data: requestData } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('id', requestId)
        .single();

      await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (requestData?.sender_id) {
        // Insert mutual friendships
        await supabase.from('friendships').upsert([
          { user_id: requestData.sender_id, friend_id: userId },
          { user_id: userId, friend_id: requestData.sender_id },
        ]);
      }
    }
    const current = await getFriendRequests(userId);
    const updated = current.filter((r) => r.id !== requestId);
    await AsyncStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(updated));
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

export async function declineFriendRequest(
  requestId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    if (isSupabaseConfigured) {
      await supabase
        .from('friend_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);
    }
    const current = await getFriendRequests(userId);
    const updated = current.filter((r) => r.id !== requestId);
    await AsyncStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(updated));
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

export async function getGroups(userId: string): Promise<Group[]> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('name');
      if (!error && data) return data as Group[];
    }

    const stored = await AsyncStorage.getItem(LOCAL_GROUPS_KEY);
    if (stored) return JSON.parse(stored);
    await AsyncStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify(DEFAULT_GROUPS));
    return DEFAULT_GROUPS;
  } catch {
    return DEFAULT_GROUPS;
  }
}

export async function createGroup(
  ownerId: string,
  name: string
): Promise<Group> {
  const newGroup: Group = {
    id: `group_${Date.now()}`,
    name,
    avatar_url: null,
    owner_id: ownerId,
    created_at: new Date().toISOString(),
    member_count: 1,
  };

  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('groups')
      .insert({ owner_id: ownerId, name })
      .select()
      .single();
    if (data) newGroup.id = data.id;
  }

  const existing = await getGroups(ownerId);
  const updated = [...existing, newGroup];
  await AsyncStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify(updated));
  return newGroup;
}
