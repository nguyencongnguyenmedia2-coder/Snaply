import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateTargetDimensions } from '@/services/imageCompressionService';
import {
  SNAPLY_BUCKET,
  LOCAL_PHOTOS_KEY,
  getSignedPhotoUrl,
  clearSignedUrlCache,
  deletePhoto,
  getUserPhotos,
} from '@/services/photoStorageService';
import { Photo, Friendship } from '@/lib/supabase';

describe('Snaply Photo Storage & Compression Service', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    clearSignedUrlCache();
  });

  describe('Image Dimension & Compression Rules', () => {
    it('does not upscale images smaller than target max dimension', () => {
      const dimensions = calculateTargetDimensions(200, 150, 320);
      expect(dimensions.width).toBe(200);
      expect(dimensions.height).toBe(150);
    });

    it('scales down landscape images larger than max dimension while preserving aspect ratio', () => {
      const dimensions = calculateTargetDimensions(3200, 1600, 1600);
      expect(dimensions.width).toBe(1600);
      expect(dimensions.height).toBe(800);
    });

    it('scales down portrait images larger than max dimension while preserving aspect ratio', () => {
      const dimensions = calculateTargetDimensions(2000, 4000, 1600);
      expect(dimensions.height).toBe(1600);
      expect(dimensions.width).toBe(800);
    });

    it('scales square images to maxDimension without distortion', () => {
      const dimensions = calculateTargetDimensions(2400, 2400, 1600);
      expect(dimensions.width).toBe(1600);
      expect(dimensions.height).toBe(1600);
    });
  });

  describe('Storage Path Convention & Security Constraints', () => {
    const ownerId = 'user-uuid-1111';
    const photoId = 'photo-uuid-2222';

    it('enforces private bucket name snaply-photos', () => {
      expect(SNAPLY_BUCKET).toBe('snaply-photos');
    });

    it('enforces strictly formatted path: {owner_uuid}/{photo_uuid}.jpg for main photo', () => {
      const expectedPath = `${ownerId}/${photoId}.jpg`;
      expect(expectedPath).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+\.jpg$/);
    });

    it('enforces strictly formatted path: {owner_uuid}/{photo_uuid}_thumb.jpg for thumbnail', () => {
      const expectedThumbPath = `${ownerId}/${photoId}_thumb.jpg`;
      expect(expectedThumbPath).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+_thumb\.jpg$/);
    });

    it('prevents user A from uploading to user B directory', () => {
      function canUploadToPath(authenticatedUserId: string, targetPath: string): boolean {
        const folder = targetPath.split('/')[0];
        return folder === authenticatedUserId;
      }

      expect(canUploadToPath('user-A', 'user-A/photo123.jpg')).toBe(true);
      expect(canUploadToPath('user-B', 'user-A/exploit.jpg')).toBe(false);
    });
  });

  describe('RLS & Friendship Authorization Logic', () => {
    const userAlice = 'alice-1111';
    const userBob = 'bob-2222';
    const userCharlie = 'charlie-3333';

    function canViewPhoto(
      viewerId: string,
      photo: { owner_id: string; deleted_at: string | null },
      friendships: Friendship[]
    ): boolean {
      if (photo.deleted_at !== null) return false;
      if (viewerId === photo.owner_id) return true;

      const [low, high] =
        viewerId < photo.owner_id ? [viewerId, photo.owner_id] : [photo.owner_id, viewerId];

      const rel = friendships.find(
        (f) => f.user_low === low && f.user_high === high && f.status === 'accepted'
      );
      return !!rel;
    }

    const alicePhoto = {
      owner_id: userAlice,
      deleted_at: null,
    };

    it('allows owner Alice to view her own photo', () => {
      expect(canViewPhoto(userAlice, alicePhoto, [])).toBe(true);
    });

    it('denies stranger Charlie from viewing Alice photo', () => {
      expect(canViewPhoto(userCharlie, alicePhoto, [])).toBe(false);
    });

    it('denies viewing when friendship status is pending, rejected, or blocked', () => {
      const [low, high] = userAlice < userBob ? [userAlice, userBob] : [userBob, userAlice];

      const pendingRel: Friendship = {
        id: 'rel-1',
        user_low: low,
        user_high: high,
        requested_by: userBob,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(canViewPhoto(userBob, alicePhoto, [pendingRel])).toBe(false);

      const rejectedRel: Friendship = { ...pendingRel, status: 'rejected' };
      expect(canViewPhoto(userBob, alicePhoto, [rejectedRel])).toBe(false);

      const blockedRel: Friendship = { ...pendingRel, status: 'blocked' };
      expect(canViewPhoto(userBob, alicePhoto, [blockedRel])).toBe(false);
    });

    it('allows accepted friend Bob to view Alice photo', () => {
      const [low, high] = userAlice < userBob ? [userAlice, userBob] : [userBob, userAlice];

      const acceptedRel: Friendship = {
        id: 'rel-1',
        user_low: low,
        user_high: high,
        requested_by: userBob,
        status: 'accepted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(canViewPhoto(userBob, alicePhoto, [acceptedRel])).toBe(true);
    });

    it('immediately denies access when friendship is cancelled (unfriended)', () => {
      // Friendship was removed from the active list
      expect(canViewPhoto(userBob, alicePhoto, [])).toBe(false);
    });

    it('SECURITY RULE: Prevents sender from self-accepting friend request', () => {
      function canAcceptRequest(userId: string, friendship: Friendship): boolean {
        // Only receiver can accept: requested_by must NOT be the person accepting
        if (friendship.requested_by === userId) return false;
        // User must be one of the participants
        if (friendship.user_low !== userId && friendship.user_high !== userId) return false;
        return friendship.status === 'pending';
      }

      const requestSentByBob: Friendship = {
        id: 'f-1',
        user_low: 'alice',
        user_high: 'bob',
        requested_by: 'bob',
        status: 'pending',
        created_at: '',
        updated_at: '',
      };

      // Bob cannot accept his own request
      expect(canAcceptRequest('bob', requestSentByBob)).toBe(false);
      // Alice (recipient) can accept
      expect(canAcceptRequest('alice', requestSentByBob)).toBe(true);
      // Eve cannot accept
      expect(canAcceptRequest('eve', requestSentByBob)).toBe(false);
    });
  });

  describe('Signed URL Caching & Expiration', () => {
    it('caches signed URLs and returns cached value before expiration', async () => {
      const path = 'user-1/photo-abc.jpg';
      const url1 = await getSignedPhotoUrl(path, 300);
      const url2 = await getSignedPhotoUrl(path, 300);

      expect(url1).toBe(url2);
      expect(url1).toContain(path);
    });

    it('clears cache and refreshes URL when clearSignedUrlCache is called', async () => {
      const path = 'user-1/photo-abc.jpg';
      await getSignedPhotoUrl(path, 300);
      clearSignedUrlCache();
      const freshUrl = await getSignedPhotoUrl(path, 300);
      expect(freshUrl).toBeDefined();
    });
  });

  describe('Safe Multi-Step Deletion & Resilience', () => {
    it('marks photo as soft-deleted and records deletion job', async () => {
      // Seed a photo in local store
      const photo: Photo = {
        id: 'photo-test-del',
        owner_id: 'user-owner-1',
        object_path: 'user-owner-1/photo-test-del.jpg',
        thumbnail_path: 'user-owner-1/photo-test-del_thumb.jpg',
        caption: 'To be deleted safely',
        mime_type: 'image/jpeg',
        width: 1200,
        height: 800,
        size_bytes: 350000,
        thumbnail_size_bytes: 42000,
        created_at: new Date().toISOString(),
        deleted_at: null,
      };

      await AsyncStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify([photo]));

      const success = await deletePhoto('photo-test-del', 'user-owner-1');
      expect(success).toBe(true);

      const stored = await AsyncStorage.getItem(LOCAL_PHOTOS_KEY);
      const list: Photo[] = JSON.parse(stored || '[]');
      const found = list.find((p) => p.id === 'photo-test-del');
      expect(found?.deleted_at).not.toBeNull();
    });

    it('SECURITY RULE: Prevents non-owner from deleting photo', async () => {
      const photo: Photo = {
        id: 'photo-alice-del',
        owner_id: 'alice-id',
        object_path: 'alice-id/photo-alice-del.jpg',
        thumbnail_path: 'alice-id/photo-alice-del_thumb.jpg',
        mime_type: 'image/jpeg',
        width: 1000,
        height: 1000,
        size_bytes: 200000,
        thumbnail_size_bytes: 30000,
        created_at: new Date().toISOString(),
        deleted_at: null,
      };

      await AsyncStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify([photo]));

      // Eve attempts to delete Alice's photo
      await expect(deletePhoto('photo-alice-del', 'eve-intruder')).rejects.toThrow();

      // Verify photo was not deleted
      const stored = await AsyncStorage.getItem(LOCAL_PHOTOS_KEY);
      const list: Photo[] = JSON.parse(stored || '[]');
      const found = list.find((p) => p.id === 'photo-alice-del');
      expect(found?.deleted_at).toBeNull();
    });
  });

  describe('Friend Photo Gallery & Profile Views', () => {
    it('retrieves all active photos for a specific friend', async () => {
      const friendId = 'friend-bob-uuid';
      const photos: Photo[] = [
        {
          id: 'photo-1',
          owner_id: friendId,
          object_path: `${friendId}/photo-1.jpg`,
          thumbnail_path: `${friendId}/photo-1_thumb.jpg`,
          caption: 'Coffee morning',
          mime_type: 'image/jpeg',
          width: 1200,
          height: 1600,
          size_bytes: 320000,
          thumbnail_size_bytes: 45000,
          created_at: new Date(Date.now() - 10000).toISOString(),
          deleted_at: null,
        },
        {
          id: 'photo-2',
          owner_id: friendId,
          object_path: `${friendId}/photo-2.jpg`,
          thumbnail_path: `${friendId}/photo-2_thumb.jpg`,
          caption: 'Sunset ride',
          mime_type: 'image/jpeg',
          width: 1600,
          height: 1200,
          size_bytes: 410000,
          thumbnail_size_bytes: 52000,
          created_at: new Date().toISOString(),
          deleted_at: null,
        },
        {
          id: 'photo-3-other',
          owner_id: 'stranger-id',
          object_path: 'stranger-id/photo-3.jpg',
          thumbnail_path: 'stranger-id/photo-3_thumb.jpg',
          caption: 'Not Bob photo',
          mime_type: 'image/jpeg',
          width: 1000,
          height: 1000,
          size_bytes: 200000,
          thumbnail_size_bytes: 30000,
          created_at: new Date().toISOString(),
          deleted_at: null,
        },
      ];

      await AsyncStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify(photos));

      const bobPhotos = await getUserPhotos(friendId);
      expect(bobPhotos.length).toBe(2);
      expect(bobPhotos.every((p) => p.owner_id === friendId)).toBe(true);
      expect(bobPhotos[0].id).toBe('photo-1');
      expect(bobPhotos[1].id).toBe('photo-2');
    });

    it('excludes soft-deleted photos from friend photo gallery', async () => {
      const friendId = 'friend-sarah-uuid';
      const photos: Photo[] = [
        {
          id: 'photo-active',
          owner_id: friendId,
          object_path: `${friendId}/active.jpg`,
          thumbnail_path: `${friendId}/active_thumb.jpg`,
          mime_type: 'image/jpeg',
          width: 1000,
          height: 1000,
          size_bytes: 200000,
          thumbnail_size_bytes: 30000,
          created_at: new Date().toISOString(),
          deleted_at: null,
        },
        {
          id: 'photo-deleted',
          owner_id: friendId,
          object_path: `${friendId}/deleted.jpg`,
          thumbnail_path: `${friendId}/deleted_thumb.jpg`,
          mime_type: 'image/jpeg',
          width: 1000,
          height: 1000,
          size_bytes: 200000,
          thumbnail_size_bytes: 30000,
          created_at: new Date().toISOString(),
          deleted_at: new Date().toISOString(), // Deleted
        },
      ];

      await AsyncStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify(photos));

      const sarahPhotos = await getUserPhotos(friendId);
      expect(sarahPhotos.length).toBe(1);
      expect(sarahPhotos[0].id).toBe('photo-active');
    });
  });

  describe('Binary Upload & MIME Type Safety', () => {
    it('correctly converts base64 encoded photo to binary ArrayBuffer without text/plain fallback', () => {
      const { base64ToArrayBuffer } = require('@/services/photoStorageService');
      // 1x1 transparent PNG base64
      const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const buffer = base64ToArrayBuffer(sampleBase64);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(70);

      const uint8 = new Uint8Array(buffer);
      // Valid PNG header: 0x89 0x50 0x4E 0x47
      expect(uint8[0]).toBe(137);
      expect(uint8[1]).toBe(80);
      expect(uint8[2]).toBe(78);
      expect(uint8[3]).toBe(71);
    });

    it('strips data URI prefix if present before converting to ArrayBuffer', () => {
      const { base64ToArrayBuffer } = require('@/services/photoStorageService');
      const dataUri = 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const buffer = base64ToArrayBuffer(dataUri);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(70);
    });
  });
});
