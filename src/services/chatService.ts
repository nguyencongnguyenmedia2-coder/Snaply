import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured, Message, Group, Profile } from '@/lib/supabase';
import { uploadPhoto } from './photoStorageService';
import { createMoment } from './momentsService';

const LOCAL_MESSAGES_PREFIX = '@snaply_messages_';
const LOCAL_CONVERSATIONS_KEY = '@snaply_conversations_list';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Unique conversation storage key for direct 1-1 or group chat
 */
export function getConversationKey(params: { groupId?: string; recipientId?: string; currentUserId?: string }): string {
  if (params.groupId) {
    return `${LOCAL_MESSAGES_PREFIX}group_${params.groupId}`;
  }
  if (params.recipientId && params.currentUserId) {
    const [low, high] =
      params.currentUserId < params.recipientId
        ? [params.currentUserId, params.recipientId]
        : [params.recipientId, params.currentUserId];
    return `${LOCAL_MESSAGES_PREFIX}direct_${low}_${high}`;
  }
  return `${LOCAL_MESSAGES_PREFIX}temp`;
}

// Initial demo seed messages for rich immediate preview
const DEMO_SEEDS: Record<string, Message[]> = {
  'group-1': [
    {
      id: 'demo-msg-1',
      sender_id: 'friend-sarah',
      group_id: 'group-1',
      content: 'Chào cả nhóm! Hôm nay ai đi cà phê không nè? ☕️🌸',
      media_url: null,
      reply_to_id: null,
      reactions: { '❤️': 3, '✨': 1 },
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      sender: {
        id: 'friend-sarah',
        username: 'sarah_m',
        display_name: 'Sarah Miller',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
        bio: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      status: 'sent',
    },
    {
      id: 'demo-msg-2',
      sender_id: 'friend-leo',
      group_id: 'group-1',
      content: 'Tầm 3h chiều ở quán quen nhé, vừa chụp được góc này chill lắm!',
      media_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      reply_to_id: 'demo-msg-1',
      reactions: { '🔥': 2 },
      created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      sender: {
        id: 'friend-leo',
        username: 'leo_explores',
        display_name: 'Leo Chen',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
        bio: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      status: 'sent',
    },
  ],
};

/**
 * 1. Fetch messages with 0ms local cache load + background network sync
 */
export async function getConversationMessages(params: {
  groupId?: string;
  recipientId?: string;
  currentUserId: string;
}): Promise<Message[]> {
  const cacheKey = getConversationKey(params);

  try {
    // 1. Read from local cache (0ms instant response)
    const stored = await AsyncStorage.getItem(cacheKey);
    let cachedList: Message[] = stored ? JSON.parse(stored) : [];

    // Fallback seed if empty
    if (cachedList.length === 0 && params.groupId && DEMO_SEEDS[params.groupId]) {
      cachedList = DEMO_SEEDS[params.groupId];
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedList));
    }

    // 2. Background sync from Supabase if online
    if (isSupabaseConfigured) {
      let query = supabase
        .from('messages')
        .select(`
          id, sender_id, receiver_id, group_id, content, media_url, reply_to_id, reactions, created_at,
          sender:profiles!sender_id(id, username, display_name, avatar_url),
          reply_to:messages!reply_to_id(id, content, media_url, sender:profiles!sender_id(display_name))
        `)
        .order('created_at', { ascending: true })
        .limit(100);

      if (params.groupId) {
        query = query.eq('group_id', params.groupId);
      } else if (params.recipientId) {
        query = query.or(
          `and(sender_id.eq.${params.currentUserId},receiver_id.eq.${params.recipientId}),and(sender_id.eq.${params.recipientId},receiver_id.eq.${params.currentUserId})`
        );
      }

      const { data, error } = await query;
      if (!error && data) {
        const syncedList: Message[] = data.map((item: any) => ({
          id: item.id,
          sender_id: item.sender_id,
          receiver_id: item.receiver_id,
          group_id: item.group_id,
          content: item.content,
          media_url: item.media_url,
          reply_to_id: item.reply_to_id,
          reply_to: item.reply_to,
          reactions: item.reactions || {},
          created_at: item.created_at,
          sender: item.sender,
          status: 'sent',
        }));

        // Merge keeping any local optimistic unsent messages
        const sendingLocals = cachedList.filter((m) => m.status === 'sending');
        const finalMerged = [...syncedList, ...sendingLocals];

        await AsyncStorage.setItem(cacheKey, JSON.stringify(finalMerged));
        return finalMerged;
      }
    }

    return cachedList;
  } catch (err) {
    console.warn('[chatService] getConversationMessages error:', err);
    return [];
  }
}

/**
 * 2. Send message with Optimistic UI (renders in <16ms before network completes)
 */
export async function sendChatMessage(params: {
  currentUserId: string;
  senderProfile?: Profile | null;
  groupId?: string;
  recipientId?: string;
  content?: string;
  mediaUrl?: string;
  replyToMessage?: Message | null;
  onOptimisticAdded?: (optimisticMsg: Message) => void;
}): Promise<Message> {
  const {
    currentUserId,
    senderProfile,
    groupId,
    recipientId,
    content,
    mediaUrl,
    replyToMessage,
    onOptimisticAdded,
  } = params;

  if (!content?.trim() && !mediaUrl) {
    throw new Error('Tin nhắn không được để trống.');
  }

  const cacheKey = getConversationKey({ groupId, recipientId, currentUserId });
  const clientTempId = `temp_${generateUUID()}`;
  const nowIso = new Date().toISOString();

  // A. Create optimistic message instance
  const optimisticMsg: Message = {
    id: clientTempId,
    sender_id: currentUserId,
    group_id: groupId || null,
    receiver_id: recipientId || null,
    content: content?.trim() || null,
    media_url: mediaUrl || null,
    reply_to_id: replyToMessage?.id || null,
    reply_to: replyToMessage || null,
    reactions: {},
    created_at: nowIso,
    status: 'sending',
    sender: senderProfile || {
      id: currentUserId,
      username: 'me',
      display_name: 'Bạn',
      avatar_url: null,
      bio: null,
      created_at: nowIso,
      updated_at: nowIso,
    },
  };

  // B. Notify UI immediately for instant rendering (<16ms)
  onOptimisticAdded?.(optimisticMsg);

  // C. Update local cache
  try {
    const stored = await AsyncStorage.getItem(cacheKey);
    const existingList: Message[] = stored ? JSON.parse(stored) : [];
    const updatedWithOptimistic = [...existingList, optimisticMsg];
    await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedWithOptimistic));
  } catch (err) {
    console.warn('[chatService] Error saving optimistic message:', err);
  }

  // D. Send to Supabase in background
  if (!isSupabaseConfigured) {
    // Offline / Mock mode auto-confirm
    setTimeout(async () => {
      optimisticMsg.status = 'sent';
      const stored = await AsyncStorage.getItem(cacheKey);
      if (stored) {
        const list: Message[] = JSON.parse(stored);
        const idx = list.findIndex((m) => m.id === clientTempId);
        if (idx !== -1) {
          list[idx].status = 'sent';
          await AsyncStorage.setItem(cacheKey, JSON.stringify(list));
        }
      }
    }, 200);
    return optimisticMsg;
  }

  try {
    const payload = {
      sender_id: currentUserId,
      group_id: groupId || null,
      receiver_id: recipientId || null,
      content: content?.trim() || null,
      media_url: mediaUrl || null,
      reply_to_id: replyToMessage?.id || null,
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select(`
        id, sender_id, receiver_id, group_id, content, media_url, reply_to_id, reactions, created_at,
        sender:profiles!sender_id(id, username, display_name, avatar_url)
      `)
      .single();

    if (error || !data) {
      throw error || new Error('Gửi tin nhắn thất bại');
    }

    // Replace optimistic record with confirmed record
    const senderRecord = Array.isArray(data.sender) ? data.sender[0] : data.sender;
    const confirmedMsg: Message = {
      id: data.id,
      sender_id: data.sender_id,
      receiver_id: data.receiver_id,
      group_id: data.group_id,
      content: data.content,
      media_url: data.media_url,
      reply_to_id: data.reply_to_id,
      reply_to: replyToMessage || null,
      reactions: data.reactions || {},
      created_at: data.created_at,
      sender: (senderRecord as Profile) || optimisticMsg.sender,
      status: 'sent',
    };

    const stored = await AsyncStorage.getItem(cacheKey);
    if (stored) {
      const list: Message[] = JSON.parse(stored);
      const replaced = list.map((m) => (m.id === clientTempId ? confirmedMsg : m));
      await AsyncStorage.setItem(cacheKey, JSON.stringify(replaced));
    }

    return confirmedMsg;
  } catch (err: any) {
    console.warn('[chatService] Send message failed, marking error:', err);
    // Mark optimistic record as error so user can tap to retry
    const stored = await AsyncStorage.getItem(cacheKey);
    if (stored) {
      const list: Message[] = JSON.parse(stored);
      const withError = list.map((m) =>
        m.id === clientTempId ? { ...m, status: 'error' as const } : m
      );
      await AsyncStorage.setItem(cacheKey, JSON.stringify(withError));
    }
    throw err;
  }
}

/**
 * 3. Quick Reaction logic (Thả cảm xúc tức thì lên tin nhắn)
 */
export async function reactToChatMessage(params: {
  messageId: string;
  emoji: string;
  userId: string;
  groupId?: string;
  recipientId?: string;
}): Promise<Record<string, number>> {
  const { messageId, emoji, userId, groupId, recipientId } = params;
  const cacheKey = getConversationKey({ groupId, recipientId, currentUserId: userId });

  let updatedReactions: Record<string, number> = {};

  // Optimistic update in cache
  try {
    const stored = await AsyncStorage.getItem(cacheKey);
    if (stored) {
      const list: Message[] = JSON.parse(stored);
      const target = list.find((m) => m.id === messageId);
      if (target) {
        const reactions = { ...(target.reactions || {}) };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        target.reactions = reactions;
        target.user_reaction = emoji;
        updatedReactions = reactions;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(list));
      }
    }
  } catch (err) {
    console.warn('[chatService] React error in cache:', err);
  }

  // Sync to Supabase
  if (isSupabaseConfigured) {
    try {
      const { data: current } = await supabase
        .from('messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      const existingReactions = current?.reactions || {};
      const newReactions = {
        ...existingReactions,
        [emoji]: (existingReactions[emoji] || 0) + 1,
      };

      await supabase
        .from('messages')
        .update({ reactions: newReactions })
        .eq('id', messageId);
    } catch (err) {
      console.warn('[chatService] React sync error:', err);
    }
  }

  return updatedReactions;
}

/**
 * 4. Create Chat Group with Members
 */
export async function createChatGroup(params: {
  ownerId: string;
  name: string;
  memberIds: string[];
  avatarUrl?: string;
}): Promise<Group> {
  const { ownerId, name, memberIds, avatarUrl } = params;

  if (!name.trim()) {
    throw new Error('Vui lòng nhập tên nhóm.');
  }

  const groupId = generateUUID();
  const newGroup: Group = {
    id: groupId,
    name: name.trim(),
    avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&auto=format&fit=crop&q=80',
    owner_id: ownerId,
    created_at: new Date().toISOString(),
    member_count: memberIds.length + 1,
  };

  if (isSupabaseConfigured) {
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: newGroup.name,
        avatar_url: newGroup.avatar_url,
        owner_id: ownerId,
      })
      .select()
      .single();

    if (groupError || !groupData) {
      throw new Error(`Tạo nhóm thất bại: ${groupError?.message}`);
    }

    newGroup.id = groupData.id;

    // Add owner + selected members to group_members
    const allMembers = Array.from(new Set([ownerId, ...memberIds]));
    const membersPayload = allMembers.map((uId) => ({
      group_id: newGroup.id,
      user_id: uId,
      role: uId === ownerId ? 'owner' : 'member',
    }));

    await supabase.from('group_members').insert(membersPayload);
  }

  // Update local groups list
  const stored = await AsyncStorage.getItem(LOCAL_CONVERSATIONS_KEY);
  const groupsList: Group[] = stored ? JSON.parse(stored) : [];
  await AsyncStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify([newGroup, ...groupsList]));

  return newGroup;
}

/**
 * 5. Post Photo directly into a Group (Shared in Chat + Group Moments Gallery)
 */
export async function postGroupPhoto(params: {
  groupId: string;
  groupName: string;
  ownerId: string;
  ownerProfile?: Profile | null;
  photoUri: string;
  caption?: string;
  onProgress?: (stage: string) => void;
}): Promise<{ message: Message; momentId: string }> {
  const { groupId, groupName, ownerId, ownerProfile, photoUri, caption, onProgress } = params;

  onProgress?.(`Đang nén & lưu ảnh nhóm ${groupName}...`);

  // 1. Upload via Snaply two-tier compression & private storage
  const photo = await uploadPhoto({
    localUri: photoUri,
    caption,
    ownerId,
    onProgress: (stage) => {
      if (stage === 'compressing') onProgress?.('Đang nén ảnh 2 tầng...');
      else if (stage === 'uploading_main') onProgress?.('Đang tải ảnh chính lên nhóm...');
      else if (stage === 'uploading_thumb') onProgress?.('Đang tạo thumbnail...');
    },
  });

  const mediaUrl = photo.main_url || photo.object_path;

  // 2. Post as Moment dedicated to this group
  onProgress?.('Đang lưu khoảnh khắc vào nhóm...');
  const moment = await createMoment({
    userId: ownerId,
    mediaUri: mediaUrl,
    caption: caption?.trim(),
    groupId,
    ownerProfile: ownerProfile
      ? {
          username: ownerProfile.username,
          display_name: ownerProfile.display_name,
          avatar_url: ownerProfile.avatar_url,
        }
      : undefined,
  });

  // 3. Post as Photo Message in the group chat stream
  onProgress?.('Đang gửi vào luồng tin nhắn nhóm...');
  const message = await sendChatMessage({
    currentUserId: ownerId,
    senderProfile: ownerProfile,
    groupId,
    content: caption?.trim() || undefined,
    mediaUrl,
  });

  return { message, momentId: moment.id };
}

/**
 * 6. Realtime subscription listener for messages
 */
export function subscribeToChatMessages(
  params: { groupId?: string; recipientId?: string; currentUserId: string },
  onMessageReceived: (message: Message) => void
): () => void {
  if (!isSupabaseConfigured) {
    return () => {};
  }

  const channelId = `chat_${params.groupId || `${params.currentUserId}_${params.recipientId}`}`;

  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: params.groupId
          ? `group_id=eq.${params.groupId}`
          : undefined,
      },
      async (payload) => {
        const newRecord = payload.new as any;
        // Check if direct message matches
        if (!params.groupId) {
          const isDirect =
            (newRecord.sender_id === params.currentUserId && newRecord.receiver_id === params.recipientId) ||
            (newRecord.sender_id === params.recipientId && newRecord.receiver_id === params.currentUserId);
          if (!isDirect) return;
        }

        // Fetch sender profile info
        const { data: sender } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newRecord.sender_id)
          .single();

        const fullMessage: Message = {
          id: newRecord.id,
          sender_id: newRecord.sender_id,
          receiver_id: newRecord.receiver_id,
          group_id: newRecord.group_id,
          content: newRecord.content,
          media_url: newRecord.media_url,
          reply_to_id: newRecord.reply_to_id,
          reactions: newRecord.reactions || {},
          created_at: newRecord.created_at,
          sender: (sender as Profile) || undefined,
          status: 'sent',
        };

        onMessageReceived(fullMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
