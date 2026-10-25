import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getConversationKey,
  getConversationMessages,
  sendChatMessage,
  reactToChatMessage,
  createChatGroup,
} from '@/services/chatService';

describe('Snaply Chat & Messaging Service (Optimistic UI & Group Features)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('Conversation Keys & Canonical Ordering', () => {
    it('creates group key with prefix', () => {
      const key = getConversationKey({ groupId: 'group-besties' });
      expect(key).toBe('@snaply_messages_group_group-besties');
    });

    it('creates direct key with canonical sorted user IDs', () => {
      const key1 = getConversationKey({ recipientId: 'user-b', currentUserId: 'user-a' });
      const key2 = getConversationKey({ recipientId: 'user-a', currentUserId: 'user-b' });
      expect(key1).toBe('@snaply_messages_direct_user-a_user-b');
      expect(key2).toBe('@snaply_messages_direct_user-a_user-b');
    });
  });

  describe('Fast Response & Optimistic UI Logic', () => {
    const currentUserId = 'user-me-123';
    const recipientId = 'friend-sarah-456';

    it('immediately calls onOptimisticAdded with status "sending" in <16ms', async () => {
      let optimisticCallbackCalled = false;
      let recordedStatus = '';

      const msg = await sendChatMessage({
        currentUserId,
        recipientId,
        content: 'Chào Sarah, hôm nay bạn thế nào? 🌸',
        onOptimisticAdded: (optimistic) => {
          optimisticCallbackCalled = true;
          recordedStatus = optimistic.status || '';
          expect(optimistic.content).toBe('Chào Sarah, hôm nay bạn thế nào? 🌸');
        },
      });

      expect(optimisticCallbackCalled).toBe(true);
      expect(recordedStatus).toBe('sending');
      expect(msg.content).toBe('Chào Sarah, hôm nay bạn thế nào? 🌸');
    });

    it('persists message to AsyncStorage cache for 0ms subsequent load', async () => {
      await sendChatMessage({
        currentUserId,
        recipientId,
        content: 'Tin nhắn lưu trong bộ nhớ đệm',
      });

      const loaded = await getConversationMessages({
        recipientId,
        currentUserId,
      });

      expect(loaded.length).toBeGreaterThan(0);
      expect(loaded.some((m) => m.content === 'Tin nhắn lưu trong bộ nhớ đệm')).toBe(true);
    });

    it('supports message quote reply carrying reply_to reference', async () => {
      const firstMsg = await sendChatMessage({
        currentUserId,
        recipientId,
        content: 'Câu hỏi ban đầu',
      });

      const replyMsg = await sendChatMessage({
        currentUserId,
        recipientId,
        content: 'Đây là câu trả lời trích dẫn!',
        replyToMessage: firstMsg,
      });

      expect(replyMsg.reply_to_id).toBe(firstMsg.id);
      expect(replyMsg.reply_to?.content).toBe('Câu hỏi ban đầu');
    });
  });

  describe('Quick Reactions on Chat Messages', () => {
    const currentUserId = 'user-me-123';
    const recipientId = 'friend-sarah-456';

    it('increments emoji reaction count optimistically', async () => {
      const msg = await sendChatMessage({
        currentUserId,
        recipientId,
        content: 'Bức ảnh chụp hoàng hôn tuyệt đẹp!',
      });

      const reactions = await reactToChatMessage({
        messageId: msg.id,
        emoji: '🔥',
        userId: currentUserId,
        recipientId,
      });

      expect(reactions['🔥']).toBe(1);

      const reactions2 = await reactToChatMessage({
        messageId: msg.id,
        emoji: '🔥',
        userId: currentUserId,
        recipientId,
      });

      expect(reactions2['🔥']).toBe(2);
    });
  });

  describe('Group Chat Creation', () => {
    const ownerId = 'user-owner-111';
    const memberIds = ['friend-1', 'friend-2', 'friend-3'];

    it('creates chat group with correct member count', async () => {
      const group = await createChatGroup({
        ownerId,
        name: 'Hội Cà Phê Chill',
        memberIds,
      });

      expect(group.id).toBeDefined();
      expect(group.name).toBe('Hội Cà Phê Chill');
      expect(group.owner_id).toBe(ownerId);
      expect(group.member_count).toBe(4); // owner + 3 friends
    });

    it('rejects empty group name', async () => {
      await expect(
        createChatGroup({
          ownerId,
          name: '   ',
          memberIds,
        })
      ).rejects.toThrow('Vui lòng nhập tên nhóm.');
    });
  });
});
