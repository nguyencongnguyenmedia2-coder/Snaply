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
    if (isSupabaseConfigured && userId && !userId.startsWith('demo')) {
      // 1. Try querying via legacy user_id / friend_id
      const res1 = await supabase
        .from('friendships')
        .select(`
          friend_id,
          profiles:friend_id (id, username, display_name, avatar_url, bio, created_at, updated_at)
        `)
        .eq('user_id', userId);

      if (!res1.error && res1.data && res1.data.length > 0) {
        const list = res1.data.map((item: any) => item.profiles).filter(Boolean);
        await AsyncStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(list));
        return list;
      }

      // 2. Try querying via user_low / user_high enhanced schema
      const res2 = await supabase
        .from('friendships')
        .select(`
          user_low, user_high, status,
          profile_low:profiles!user_low(id, username, display_name, avatar_url, bio, created_at, updated_at),
          profile_high:profiles!user_high(id, username, display_name, avatar_url, bio, created_at, updated_at)
        `)
        .or(`user_low.eq.${userId},user_high.eq.${userId}`)
        .eq('status', 'accepted');

      if (!res2.error && res2.data && res2.data.length > 0) {
        const list = res2.data
          .map((r: any) => (r.user_low === userId ? r.profile_high : r.profile_low))
          .filter(Boolean);
        await AsyncStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(list));
        return list;
      }

      // If connected to Supabase and user legitimately has no friends yet
      if (!res1.error || !res2.error) {
        const stored = await AsyncStorage.getItem(LOCAL_FRIENDS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
        return [];
      }
    }

    const stored = await AsyncStorage.getItem(LOCAL_FRIENDS_KEY);
    if (stored) return JSON.parse(stored);
    await AsyncStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(DEFAULT_FRIENDS));
    return DEFAULT_FRIENDS;
  } catch (err) {
    console.warn('[friendsService] getFriends error:', err);
    return [];
  }
}

export async function getFriendRequests(userId: string): Promise<FriendRequest[]> {
  try {
    if (isSupabaseConfigured && userId && !userId.startsWith('demo')) {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          id, sender_id, receiver_id, status, created_at,
          sender:profiles!sender_id (id, username, display_name, avatar_url)
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending');

      if (!error && data) {
        await AsyncStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(data));
        return data as unknown as FriendRequest[];
      }
    }

    const stored = await AsyncStorage.getItem(LOCAL_REQUESTS_KEY);
    if (stored) return JSON.parse(stored);
    return [];
  } catch {
    return [];
  }
}

export async function sendFriendRequest(
  senderId: string,
  targetUsername: string
): Promise<{ error: Error | null }> {
  try {
    const cleanUsername = targetUsername.replace(/^@/, '').trim().toLowerCase();

    if (!cleanUsername) {
      return { error: new Error('Vui lòng nhập tên người dùng @username.') };
    }

    if (isSupabaseConfigured) {
      // 1. Find target user by username
      const { data: targetUser, error: findError } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (findError || !targetUser) {
        return { error: new Error(`Không tìm thấy người dùng với @${cleanUsername}.`) };
      }

      if (targetUser.id === senderId) {
        return { error: new Error('Bạn không thể tự gửi lời mời kết bạn cho chính mình.') };
      }

      // 2. Check if already friends or already requested
      const { data: existingReq } = await supabase
        .from('friend_requests')
        .select('id, status, sender_id')
        .or(
          `and(sender_id.eq.${senderId},receiver_id.eq.${targetUser.id}),and(sender_id.eq.${targetUser.id},receiver_id.eq.${senderId})`
        )
        .maybeSingle();

      if (existingReq) {
        if (existingReq.status === 'accepted') {
          return { error: new Error(`Bạn và @${cleanUsername} đã là bạn bè rồi.`) };
        }
        if (existingReq.status === 'pending') {
          if (existingReq.sender_id === senderId) {
            return { error: new Error('Lời mời kết bạn đã được gửi trước đó và đang chờ phản hồi.') };
          } else {
            // Target user already sent request to us! Automatically accept it!
            return await acceptFriendRequest(existingReq.id, senderId);
          }
        }
      }

      // 3. Insert into friend_requests
      const { error: reqError } = await supabase.from('friend_requests').insert({
        sender_id: senderId,
        receiver_id: targetUser.id,
        status: 'pending',
      });

      if (reqError) {
        console.warn('[friendsService] friend_requests insert error:', reqError);
        // Fallback or dual-schema insert
      }

      // Also upsert dual-compatibility record in friendships table
      const user_low = senderId < targetUser.id ? senderId : targetUser.id;
      const user_high = senderId < targetUser.id ? targetUser.id : senderId;
      try {
        await supabase.from('friendships').upsert({
          user_low,
          user_high,
          requested_by: senderId,
          status: 'pending',
          user_id: senderId,
          friend_id: targetUser.id,
        });
      } catch {}
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
    let senderId: string | null = null;
    let senderProfile: Profile | null = null;

    if (isSupabaseConfigured) {
      const { data: requestData } = await supabase
        .from('friend_requests')
        .select(`
          sender_id, receiver_id,
          sender:profiles!sender_id (id, username, display_name, avatar_url, bio, created_at, updated_at)
        `)
        .eq('id', requestId)
        .maybeSingle();

      if (requestData?.sender_id) {
        senderId = requestData.sender_id;
        senderProfile = (requestData as any).sender;
      }

      await supabase
        .from('friend_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (senderId) {
        const user_low = senderId < userId ? senderId : userId;
        const user_high = senderId < userId ? userId : senderId;

        // Upsert mutual friendship with both schema structures
        await supabase.from('friendships').upsert([
          {
            user_id: senderId,
            friend_id: userId,
            user_low,
            user_high,
            requested_by: senderId,
            status: 'accepted',
          },
          {
            user_id: userId,
            friend_id: senderId,
            user_low,
            user_high,
            requested_by: senderId,
            status: 'accepted',
          },
        ]);
      }
    }

    // Update local friend requests cache
    const currentReqs = await getFriendRequests(userId);
    const targetReq = currentReqs.find((r) => r.id === requestId);
    if (!senderProfile && targetReq?.sender) {
      senderProfile = targetReq.sender as Profile;
    }

    const updatedReqs = currentReqs.filter((r) => r.id !== requestId);
    await AsyncStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(updatedReqs));

    // Update local friends cache immediately
    if (senderProfile) {
      const stored = await AsyncStorage.getItem(LOCAL_FRIENDS_KEY);
      const list: Profile[] = stored ? JSON.parse(stored) : [];
      if (!list.some((f) => f.id === senderProfile?.id)) {
        await AsyncStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify([senderProfile, ...list]));
      }
    }

    return { error: null };
  } catch (err: any) {
    console.warn('[friendsService] acceptFriendRequest error:', err);
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
        .update({ status: 'declined', updated_at: new Date().toISOString() })
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

export async function removeFriend(
  userId: string,
  friendId: string
): Promise<{ error: Error | null }> {
  try {
    if (isSupabaseConfigured) {
      const user_low = userId < friendId ? userId : friendId;
      const user_high = userId < friendId ? friendId : userId;

      await Promise.all([
        supabase.from('friendships').delete().or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`),
        supabase.from('friendships').delete().match({ user_low, user_high }),
        supabase.from('friend_requests').delete().or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`),
      ]);
    }

    const stored = await AsyncStorage.getItem(LOCAL_FRIENDS_KEY);
    if (stored) {
      const list: Profile[] = JSON.parse(stored);
      const updated = list.filter((f) => f.id !== friendId);
      await AsyncStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(updated));
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

export interface SearchedUser extends Profile {
  friendship_status: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  request_id?: string;
}

export async function searchUsers(
  query: string,
  currentUserId: string
): Promise<SearchedUser[]> {
  const clean = query.replace(/^@/, '').trim().toLowerCase();
  if (!clean) return [];

  try {
    if (isSupabaseConfigured && currentUserId) {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, created_at, updated_at')
        .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
        .neq('id', currentUserId)
        .limit(20);

      if (!error && users && users.length > 0) {
        // Fetch friendship & request status with these users
        const [requestsRes, friendshipsRes] = await Promise.all([
          supabase
            .from('friend_requests')
            .select('id, sender_id, receiver_id, status')
            .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`),
          supabase
            .from('friendships')
            .select('user_id, friend_id, user_low, user_high, status')
            .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId},user_low.eq.${currentUserId},user_high.eq.${currentUserId}`),
        ]);

        const reqs = requestsRes.data || [];
        const friendships = friendshipsRes.data || [];

        return users.map((u) => {
          // Check if accepted friend
          const isFriend =
            friendships.some(
              (f) =>
                (f.user_id === currentUserId && f.friend_id === u.id) ||
                (f.user_id === u.id && f.friend_id === currentUserId) ||
                ((f.user_low === u.id || f.user_high === u.id) && f.status === 'accepted')
            ) ||
            reqs.some(
              (r) =>
                r.status === 'accepted' &&
                ((r.sender_id === currentUserId && r.receiver_id === u.id) ||
                  (r.sender_id === u.id && r.receiver_id === currentUserId))
            );

          if (isFriend) {
            return { ...u, friendship_status: 'friends' };
          }

          // Check if pending request
          const pending = reqs.find(
            (r) =>
              r.status === 'pending' &&
              ((r.sender_id === currentUserId && r.receiver_id === u.id) ||
                (r.sender_id === u.id && r.receiver_id === currentUserId))
          );

          if (pending) {
            if (pending.sender_id === currentUserId) {
              return { ...u, friendship_status: 'pending_sent', request_id: pending.id };
            } else {
              return { ...u, friendship_status: 'pending_received', request_id: pending.id };
            }
          }

          return { ...u, friendship_status: 'none' };
        });
      }
    }

    // Offline / Mock fallback
    return DEFAULT_FRIENDS.filter(
      (u) =>
        u.username.toLowerCase().includes(clean) ||
        u.display_name.toLowerCase().includes(clean)
    ).map((u) => ({ ...u, friendship_status: 'friends' }));
  } catch (err) {
    console.warn('[friendsService] searchUsers error:', err);
    return [];
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

/**
 * Fetch a user's public profile by ID
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) return data as Profile;
    }

    // Check local default friends or storage
    const defaultFriend = DEFAULT_FRIENDS.find((f) => f.id === userId);
    if (defaultFriend) return defaultFriend;

    const stored = await AsyncStorage.getItem(LOCAL_FRIENDS_KEY);
    if (stored) {
      const list: Profile[] = JSON.parse(stored);
      const found = list.find((p) => p.id === userId);
      if (found) return found;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check friendship relationship status between two users
 */
export async function getFriendshipStatus(
  currentUserId: string,
  targetUserId: string
): Promise<'accepted' | 'pending' | 'none' | 'self'> {
  if (currentUserId === targetUserId) return 'self';

  try {
    if (isSupabaseConfigured) {
      const low = currentUserId < targetUserId ? currentUserId : targetUserId;
      const high = currentUserId < targetUserId ? targetUserId : currentUserId;

      const { data } = await supabase
        .from('friendships')
        .select('status, requested_by')
        .eq('user_low', low)
        .eq('user_high', high)
        .maybeSingle();

      if (data) {
        return data.status as 'accepted' | 'pending';
      }

      // Check legacy friend_requests table if present
      const { data: req } = await supabase
        .from('friend_requests')
        .select('status')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`)
        .maybeSingle();

      if (req?.status === 'accepted') return 'accepted';
      if (req?.status === 'pending') return 'pending';

      return 'none';
    }

    // Local check
    const stored = await AsyncStorage.getItem(LOCAL_FRIENDS_KEY);
    const list: Profile[] = stored ? JSON.parse(stored) : DEFAULT_FRIENDS;
    const isFriend = list.some((f) => f.id === targetUserId);
    return isFriend ? 'accepted' : 'none';
  } catch {
    return 'none';
  }
}

