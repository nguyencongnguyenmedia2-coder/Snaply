import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  searchUsers,
  getGroups,
  createGroup,
} from '@/services/friendsService';

describe('friendsService Unit Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads friends list and groups', async () => {
    const friends = await getFriends('test-user');
    expect(Array.isArray(friends)).toBe(true);

    const groups = await getGroups('test-user');
    expect(Array.isArray(groups)).toBe(true);
    expect(groups.length).toBeGreaterThan(0);
  });

  it('creates private circles / groups successfully', async () => {
    const newGroup = await createGroup('test-user', 'Hiking Pals 🌲');
    expect(newGroup.name).toBe('Hiking Pals 🌲');
    expect(newGroup.owner_id).toBe('test-user');

    const groups = await getGroups('test-user');
    expect(groups.some((g) => g.name === 'Hiking Pals 🌲')).toBe(true);
  });

  it('handles friend request accept, decline, and remove friend transitions', async () => {
    // Seed a mock request into AsyncStorage
    const mockReq = {
      id: 'req-mock-1',
      sender_id: 'user-elena',
      receiver_id: 'test-user',
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      sender: {
        id: 'user-elena',
        username: 'elena_v',
        display_name: 'Elena Vance',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      },
    };
    await AsyncStorage.setItem('@momo_friend_requests', JSON.stringify([mockReq]));

    const reqs = await getFriendRequests('test-user');
    expect(reqs.length).toBe(1);
    const targetReq = reqs[0];

    // Accept
    const acceptRes = await acceptFriendRequest(targetReq.id, 'test-user');
    expect(acceptRes.error).toBeNull();

    const remaining = await getFriendRequests('test-user');
    expect(remaining.find((r) => r.id === targetReq.id)).toBeUndefined();

    // Check newly accepted friend is in friends list
    const friends = await getFriends('test-user');
    expect(friends.some((f) => f.id === 'user-elena')).toBe(true);

    // Remove friend
    const removeRes = await removeFriend('test-user', 'user-elena');
    expect(removeRes.error).toBeNull();

    const afterRemove = await getFriends('test-user');
    expect(afterRemove.some((f) => f.id === 'user-elena')).toBe(false);

    // Decline non-existent
    const declineRes = await declineFriendRequest('req-nonexistent', 'test-user');
    expect(declineRes.error).toBeNull();

    // Send friend request validation
    const sendRes = await sendFriendRequest('test-user', 'nonexistent_user');
    expect(sendRes).toBeDefined();

    // Search users
    const searchRes = await searchUsers('sarah', 'test-user');
    expect(Array.isArray(searchRes)).toBe(true);
  });
});
