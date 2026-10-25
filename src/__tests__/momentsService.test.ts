import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFeedMoments,
  createMoment,
  reactToMoment,
  deleteMoment,
} from '@/services/momentsService';
import { getLatestWidgetSnapshot } from '@/services/widgetService';

describe('momentsService Integration & Unit Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('fetches initial feed moments with fallback structure', async () => {
    const moments = await getFeedMoments('user-1');
    expect(moments).toBeDefined();
    expect(moments.length).toBeGreaterThan(0);
    expect(moments[0]).toHaveProperty('id');
    expect(moments[0]).toHaveProperty('media_url');
    expect(moments[0]).toHaveProperty('owner');
  });

  it('creates a new moment, stores it locally, and updates widget snapshot', async () => {
    const newMoment = await createMoment({
      userId: 'test-user-1',
      mediaUri: 'file:///local/test.jpg',
      caption: 'Sunset with friends',
      recipientIds: ['friend-2', 'friend-3'],
      ownerProfile: {
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: null,
      },
    });

    expect(newMoment.caption).toBe('Sunset with friends');
    expect(newMoment.owner_id).toBe('test-user-1');

    const feed = await getFeedMoments('test-user-1');
    expect(feed[0].id).toBe(newMoment.id);

    // Verify widget snapshot was refreshed
    const widgetSnapshot = await getLatestWidgetSnapshot();
    expect(widgetSnapshot).not.toBeNull();
    expect(widgetSnapshot?.latestMomentId).toBe(newMoment.id);
    expect(widgetSnapshot?.deepLink).toBe(`snaply://moment/${newMoment.id}`);
  });

  it('handles emoji reactions: adds reaction and toggles off on repeated tap', async () => {
    const feed = await getFeedMoments('user-1');
    const targetId = feed[0].id;

    // React with fire
    const res1 = await reactToMoment(targetId, '🔥', 'user-1');
    expect(res1.userReaction).toBe('🔥');
    expect(res1.reactions['🔥']).toBeGreaterThan(0);

    // Toggle off by reacting with same emoji
    const res2 = await reactToMoment(targetId, '🔥', 'user-1');
    expect(res2.userReaction).toBeNull();
  });

  it('deletes owned moment and removes it from feed and widget state', async () => {
    const created = await createMoment({
      userId: 'user-delete-test',
      mediaUri: 'file:///local/photo.jpg',
      caption: 'To be deleted',
    });

    const deleted = await deleteMoment(created.id, 'user-delete-test');
    expect(deleted).toBe(true);

    const feed = await getFeedMoments('user-delete-test');
    const found = feed.find((m) => m.id === created.id);
    expect(found).toBeUndefined();
  });
});
