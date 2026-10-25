import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { MOMOAvatar, MOMOIconButton } from '@/components/ui';
import {
  getConversationMessages,
  sendChatMessage,
  reactToChatMessage,
  subscribeToChatMessages,
  postGroupPhoto,
} from '@/services/chatService';
import { getUserProfile, getGroups } from '@/services/friendsService';
import { Message, Profile, Group } from '@/lib/supabase';

const QUICK_REPLIES = [
  'Xinh quá! 💖',
  'Đang tới nè 🏃💨',
  'Okela bạn ơi 👌',
  'Cười xỉu 😂',
  'Cà phê không? ☕',
  'Tuyệt vời luôn ✨',
];

const QUICK_EMOJIS = ['❤️', '😂', '🔥', '✨', '👍', '🥺'];

export default function ChatScreen() {
  const router = useRouter();
  const { id, type = 'group' } = useLocalSearchParams<{ id: string; type?: 'group' | 'direct' }>();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii, shadows } = useTheme();
  const { user, profile } = useAuth();

  const isGroup = type === 'group';

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);

  // Conversation Target Info
  const [groupInfo, setGroupInfo] = useState<Group | null>(null);
  const [friendInfo, setFriendInfo] = useState<Profile | null>(null);

  // Photo sending
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgressStage, setUploadProgressStage] = useState('');

  // Selected image preview modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  };

  // Load conversation metadata (Group or Friend)
  useEffect(() => {
    async function loadMeta() {
      if (!user || !id) return;
      if (isGroup) {
        const groups = await getGroups(user.id);
        const found = groups.find((g) => g.id === id);
        if (found) setGroupInfo(found);
      } else {
        const friend = await getUserProfile(id);
        if (friend) setFriendInfo(friend);
      }
    }
    loadMeta();
  }, [id, isGroup, user]);

  // Load messages & Realtime subscription
  useEffect(() => {
    if (!user || !id) return;

    const currentUserId = user.id;
    let isMounted = true;

    async function load() {
      setLoading(true);
      const list = await getConversationMessages({
        groupId: isGroup ? id : undefined,
        recipientId: !isGroup ? id : undefined,
        currentUserId,
      });
      if (isMounted) {
        setMessages(list);
        setLoading(false);
      }
    }

    load();

    // Subscribe to realtime updates
    const unsubscribe = subscribeToChatMessages(
      {
        groupId: isGroup ? id : undefined,
        recipientId: !isGroup ? id : undefined,
        currentUserId,
      },
      (newMsg) => {
        setMessages((prev) => {
          // Avoid duplicate insertion
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [id, isGroup, user]);

  // Send text message (Optimistic update)
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || !user) return;

    triggerHaptic();
    setInputText('');
    const targetReply = replyingTo;
    setReplyingTo(null);

    try {
      await sendChatMessage({
        currentUserId: user.id,
        senderProfile: profile,
        groupId: isGroup ? id : undefined,
        recipientId: !isGroup ? id : undefined,
        content: text,
        replyToMessage: targetReply,
        onOptimisticAdded: (optimistic) => {
          setMessages((prev) => [...prev, optimistic]);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 50);
        },
      });
    } catch (err: any) {
      console.warn('Failed to send message:', err);
    }
  };

  // Quick reply pill tap
  const handleQuickReply = (pillText: string) => {
    handleSendMessage(pillText);
  };

  // React to a message
  const handleReact = async (messageId: string, emoji: string) => {
    if (!user) return;
    triggerHaptic();
    setActiveReactionMsgId(null);

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) {
          const reactions = { ...(m.reactions || {}) };
          reactions[emoji] = (reactions[emoji] || 0) + 1;
          return { ...m, reactions, user_reaction: emoji };
        }
        return m;
      })
    );

    await reactToChatMessage({
      messageId,
      emoji,
      userId: user.id,
      groupId: isGroup ? id : undefined,
      recipientId: !isGroup ? id : undefined,
    });
  };

  // Pick and send photo directly into group/chat
  const handlePickAndSendPhoto = async () => {
    if (!user) return;
    triggerHaptic();

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    const photoUri = result.assets[0].uri;

    try {
      setIsUploadingPhoto(true);
      setUploadProgressStage('Đang chuẩn bị ảnh...');

      if (isGroup) {
        // Upload and sync with group moments and chat
        const res = await postGroupPhoto({
          groupId: id,
          groupName: groupInfo?.name || 'Nhóm',
          ownerId: user.id,
          ownerProfile: profile,
          photoUri,
          onProgress: (stage) => setUploadProgressStage(stage),
        });
        setMessages((prev) => [...prev, res.message]);
      } else {
        // Upload photo and send as direct message
        const photo = await sendChatMessage({
          currentUserId: user.id,
          senderProfile: profile,
          recipientId: id,
          mediaUrl: photoUri,
          onOptimisticAdded: (optimistic) => {
            setMessages((prev) => [...prev, optimistic]);
          },
        });
      }
    } catch (err: any) {
      console.warn('Send photo error:', err);
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgressStage('');
    }
  };

  const titleName = isGroup ? groupInfo?.name || 'Nhóm nhắn tin' : friendInfo?.display_name || 'Trò chuyện';
  const subtitleInfo = isGroup
    ? `${groupInfo?.member_count || 3} thành viên • Trực tiếp`
    : friendInfo ? `@${friendInfo.username}` : 'Đang hoạt động';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 12),
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            ...shadows.sm,
          },
        ]}>
        <MOMOIconButton
          icon={<Ionicons name="chevron-back" size={26} color={colors.text} />}
          onPress={() => router.back()}
          accessibilityLabel="Quay lại"
          size={38}
        />

        <Pressable
          onPress={() => {
            if (isGroup) {
              router.push(`/group/${id}` as any);
            } else if (friendInfo) {
              router.push(`/user/${friendInfo.id}` as any);
            }
          }}
          style={styles.headerTitleContainer}>
          {isGroup ? (
            <View style={[styles.groupAvatarBadge, { backgroundColor: colors.coralLight }]}>
              <Ionicons name="people" size={20} color={colors.coral} />
            </View>
          ) : (
            <MOMOAvatar url={friendInfo?.avatar_url} name={friendInfo?.display_name} size="sm" />
          )}

          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={[typography.headline, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
              {titleName}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {subtitleInfo}
            </Text>
          </View>
        </Pressable>

        {isGroup && (
          <Pressable
            onPress={() => router.push(`/group/${id}`)}
            style={[styles.groupGalleryHeaderBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <Ionicons name="images" size={18} color={colors.coral} />
            <Text style={[typography.caption, { color: colors.coral, fontWeight: '700', marginLeft: 4 }]}>
              Kho ảnh
            </Text>
          </Pressable>
        )}
      </View>

      {/* Messages Feed */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.coral} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 10 }]}>
            Đang tải cuộc trò chuyện...
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.messagesListContent, { paddingBottom: 16 }]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.coralLight }]}>
                <Ionicons name="chatbubbles" size={32} color={colors.coral} />
              </View>
              <Text style={[typography.headline, { color: colors.text, fontWeight: '700', marginTop: 12 }]}>
                Bắt đầu trò chuyện!
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 4, maxWidth: 260 }]}>
                Gửi tin nhắn hoặc chia sẻ ảnh đầu tiên để kết nối cùng {titleName}.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.sender_id === user?.id;
            const senderName = item.sender?.display_name || item.sender?.username || 'Bạn bè';

            return (
              <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
                {/* Other user avatar (only in group or friend messages) */}
                {!isMe && (
                  <Pressable
                    onPress={() => item.sender?.id && router.push(`/user/${item.sender.id}` as any)}
                    style={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: 4 }}>
                    <MOMOAvatar url={item.sender?.avatar_url} name={senderName} size="xs" />
                  </Pressable>
                )}

                <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperOther]}>
                  {/* Sender Name in Group Chat */}
                  {!isMe && isGroup && (
                    <Text style={[typography.caption, { color: colors.coralDark, fontWeight: '700', marginBottom: 2 }]}>
                      {senderName}
                    </Text>
                  )}

                  {/* Quoted Message / Reply Preview */}
                  {item.reply_to && (
                    <View
                      style={[
                        styles.quotedContainer,
                        {
                          backgroundColor: isMe ? 'rgba(0,0,0,0.08)' : colors.surfaceSubtle,
                          borderLeftColor: isMe ? '#FFFFFF' : colors.coral,
                        },
                      ]}>
                      <Text style={[typography.caption, { fontWeight: '700', color: isMe ? '#FFFFFF' : colors.text }]}>
                        {item.reply_to.sender?.display_name || 'Người dùng'}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[typography.caption, { color: isMe ? 'rgba(255,255,255,0.85)' : colors.textSecondary }]}>
                        {item.reply_to.content || (item.reply_to.media_url ? '📷 Hình ảnh' : '')}
                      </Text>
                    </View>
                  )}

                  {/* Photo Bubble */}
                  {item.media_url && (
                    <Pressable
                      onPress={() => setPreviewPhotoUrl(item.media_url!)}
                      style={styles.messagePhotoContainer}>
                      <Image
                        source={{ uri: item.media_url }}
                        style={styles.messagePhotoImage}
                        contentFit="cover"
                        transition={200}
                      />
                    </Pressable>
                  )}

                  {/* Text Content */}
                  {item.content && (
                    <Text
                      style={[
                        typography.body,
                        {
                          color: isMe ? '#FFFFFF' : colors.text,
                          fontWeight: '500',
                          lineHeight: 20,
                        },
                      ]}>
                      {item.content}
                    </Text>
                  )}

                  {/* Footer status & timestamp */}
                  <View style={styles.messageFooterRow}>
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
                          fontSize: 10,
                        },
                      ]}>
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>

                    {isMe && (
                      <View style={{ marginLeft: 4 }}>
                        {item.status === 'sending' ? (
                          <ActivityIndicator size="small" color="#FFFFFF" style={{ transform: [{ scale: 0.6 }] }} />
                        ) : (
                          <Ionicons name="checkmark-done" size={13} color="#FFFFFF" />
                        )}
                      </View>
                    )}
                  </View>

                  {/* Reactions Badge */}
                  {item.reactions && Object.keys(item.reactions).length > 0 && (
                    <View style={styles.reactionsBadgeContainer}>
                      {Object.entries(item.reactions).map(([emoji, count]) => {
                        const num = Number(count);
                        return (
                          <View key={emoji} style={[styles.reactionPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={{ fontSize: 11 }}>{emoji}</Text>
                            {num > 1 && (
                              <Text style={[typography.caption, { fontSize: 10, fontWeight: '700', color: colors.text, marginLeft: 2 }]}>
                                {num}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Quick Action Button (Reply / React) */}
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    setActiveReactionMsgId(activeReactionMsgId === item.id ? null : item.id);
                  }}
                  style={styles.quickActionTrigger}>
                  <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
                </Pressable>

                {/* Floating Reaction Bar when toggled */}
                {activeReactionMsgId === item.id && (
                  <View
                    style={[
                      styles.floatingReactionsBar,
                      isMe ? { right: 10 } : { left: 40 },
                      { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.md },
                    ]}>
                    {QUICK_EMOJIS.map((emoji) => (
                      <Pressable key={emoji} onPress={() => handleReact(item.id, emoji)} style={styles.emojiPressable}>
                        <Text style={{ fontSize: 18 }}>{emoji}</Text>
                      </Pressable>
                    ))}
                    <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 4 }} />
                    <Pressable
                      onPress={() => {
                        triggerHaptic();
                        setReplyingTo(item);
                        setActiveReactionMsgId(null);
                      }}
                      style={styles.replyPressable}>
                      <Ionicons name="arrow-undo" size={16} color={colors.coral} />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Uploading Photo Overlay Toast */}
      {isUploadingPhoto && (
        <View style={[styles.uploadingToast, { backgroundColor: colors.charcoal }]}>
          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
            {uploadProgressStage}
          </Text>
        </View>
      )}

      {/* Replying Banner */}
      {replyingTo && (
        <View style={[styles.replyingBanner, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: colors.coral, fontWeight: '700' }]}>
              Đang trả lời {replyingTo.sender?.display_name || 'tin nhắn'}
            </Text>
            <Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary }]}>
              {replyingTo.content || (replyingTo.media_url ? '📷 Hình ảnh' : '')}
            </Text>
          </View>
          <Pressable onPress={() => setReplyingTo(null)} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* Quick Reply Pills Carousel */}
      <View style={styles.quickRepliesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={QUICK_REPLIES}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleQuickReply(item)}
              style={[styles.quickReplyPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Bottom Input Controls Bar */}
      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}>
        {/* Photo / Camera Action */}
        <Pressable
          onPress={handlePickAndSendPhoto}
          style={[styles.cameraActionBtn, { backgroundColor: colors.coralLight }]}>
          <Ionicons name="camera" size={22} color={colors.coral} />
        </Pressable>

        {/* Text Input Field */}
        <View style={[styles.textInputWrapper, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <TextInput
            placeholder="Gửi tin nhắn..."
            placeholderTextColor={colors.textSecondary + '88'}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            style={[styles.textInput, { color: colors.text }]}
          />
        </View>

        {/* Send Button */}
        <Pressable
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim()}
          style={[
            styles.sendBtn,
            {
              backgroundColor: inputText.trim() ? colors.coral : colors.border,
            },
          ]}>
          <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Fullscreen Photo Zoom Modal */}
      <Modal visible={!!previewPhotoUrl} transparent animationType="fade">
        <View style={styles.photoModalBackdrop}>
          <Pressable onPress={() => setPreviewPhotoUrl(null)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </Pressable>
          {previewPhotoUrl && (
            <Image
              source={{ uri: previewPhotoUrl }}
              style={styles.modalFullImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  groupAvatarBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupGalleryHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    position: 'relative',
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubbleWrapper: {
    maxWidth: '76%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'relative',
  },
  bubbleWrapperMe: {
    backgroundColor: '#FF806E', // Snaply coral
    borderBottomRightRadius: 4,
  },
  bubbleWrapperOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#EFE7DE',
  },
  quotedContainer: {
    padding: 6,
    borderRadius: 10,
    borderLeftWidth: 3,
    marginBottom: 6,
  },
  messagePhotoContainer: {
    width: 220,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 6,
  },
  messagePhotoImage: {
    width: '100%',
    height: '100%',
  },
  messageFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  reactionsBadgeContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -10,
    left: 10,
    gap: 4,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    elevation: 2,
  },
  quickActionTrigger: {
    padding: 6,
    alignSelf: 'center',
    opacity: 0.6,
  },
  floatingReactionsBar: {
    position: 'absolute',
    top: -40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
    zIndex: 100,
  },
  emojiPressable: {
    paddingHorizontal: 4,
  },
  replyPressable: {
    paddingHorizontal: 6,
  },
  replyingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  quickRepliesContainer: {
    paddingVertical: 6,
  },
  quickReplyPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  cameraActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textInputWrapper: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 100,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
    padding: 0,
    margin: 0,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  uploadingToast: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 50,
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  modalFullImage: {
    width: '100%',
    height: '80%',
  },
});
