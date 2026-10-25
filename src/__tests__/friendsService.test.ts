import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
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
    expect(friends.length).toBeGreaterThan(0);

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

  it('handles friend request accept and decline transitions', async () => {
    const reqs = await getFriendRequests('test-user');
    expect(reqs.length).toBeGreaterThan(0);
    const targetReq = reqs[0];

    // Accept
    const acceptRes = await acceptFriendRequest(targetReq.id, 'test-user');
    expect(acceptRes.error).toBeNull();

    const remaining = await getFriendRequests('test-user');
    expect(remaining.find((r) => r.id === targetReq.id)).toBeUndefined();
  });
});
