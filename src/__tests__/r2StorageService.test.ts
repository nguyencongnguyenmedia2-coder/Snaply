import {
  getR2PhotoUrl,
  clearR2UrlCache,
  uploadPhotoToR2,
  R2_BUCKET,
} from '../services/r2StorageService';
import * as imageCompressionService from '../services/imageCompressionService';

// Mock imageCompressionService
jest.mock('../services/imageCompressionService', () => ({
  compressPhotoForUpload: jest.fn().mockResolvedValue({
    main: {
      uri: 'file:///local/compressed.jpg',
      width: 1080,
      height: 1350,
      sizeBytes: 150000,
      base64: 'bW9ja19tYWluX2Jhc2U2NA==',
    },
    thumbnail: {
      uri: 'file:///local/thumb.jpg',
      width: 320,
      height: 400,
      sizeBytes: 25000,
      base64: 'bW9ja190aHVtYl9iYXNlNjQ=',
    },
  }),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
}));

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-uuid-123' },
            access_token: 'mock-jwt-token',
          },
        },
      }),
    },
  },
  isSupabaseConfigured: true,
}));

describe('Cloudflare R2 Storage Integration', () => {
  beforeEach(() => {
    clearR2UrlCache();
    jest.clearAllMocks();
  });

  describe('Configuration & Constants', () => {
    it('uses correct snaply-media bucket', () => {
      expect(R2_BUCKET).toBe('snaply-media');
    });
  });

  describe('getR2PhotoUrl', () => {
    it('returns empty string if objectKey is empty', async () => {
      const url = await getR2PhotoUrl('');
      expect(url).toBe('');
    });

    it('returns remote URL as-is if already an http URL', async () => {
      const httpUrl = 'https://custom-r2.snaply.app/photo.jpg';
      const url = await getR2PhotoUrl(httpUrl);
      expect(url).toBe(httpUrl);
    });

    it('fetches presigned GET URL and caches in memory', async () => {
      const mockSignedUrl = 'https://snaply-media.r2.cloudflarestorage.com/test-user/photo.jpg?token=abc';
      
      // Mock global fetch
      const originalFetch = (globalThis as any).fetch;
      (globalThis as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ url: mockSignedUrl, objectKey: 'test-user/photo.jpg' }),
      } as any);

      const url1 = await getR2PhotoUrl('test-user/photo.jpg', 3600);
      expect(url1).toBe(mockSignedUrl);
      expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);

      // Second call should hit memory cache without re-fetching
      const url2 = await getR2PhotoUrl('test-user/photo.jpg', 3600);
      expect(url2).toBe(mockSignedUrl);
      expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);

      (globalThis as any).fetch = originalFetch;
    });
  });

  describe('uploadPhotoToR2 Pipeline', () => {
    it('throws error if ownerId is missing', async () => {
      await expect(
        uploadPhotoToR2({
          localUri: 'file:///photo.jpg',
          ownerId: '',
        })
      ).rejects.toThrow('Người dùng chưa đăng nhập');
    });

    it('successfully uploads photo via presigned PUT and completes upload', async () => {
      const originalFetch = (globalThis as any).fetch;
      
      // Mock fetch sequence:
      // 1. POST /api/media/upload-url (main)
      // 2. PUT upload to R2 (main)
      // 3. POST /api/media/upload-url (thumb)
      // 4. PUT upload to R2 (thumb)
      // 5. POST /api/media/complete
      (globalThis as any).fetch = jest.fn().mockImplementation((url: string, options: any) => {
        if (typeof url === 'string' && url.includes('/api/media/upload-url')) {
          const body = JSON.parse(options?.body || '{}');
          const isThumb = body.isThumbnail;
          return Promise.resolve({
            ok: true,
            json: async () => ({
              uploadUrl: `https://r2.mock/presigned-put-${isThumb ? 'thumb' : 'main'}`,
              objectKey: `test-user-uuid-123/${isThumb ? 'photo_thumb.jpg' : 'photo.jpg'}`,
              expiresInSeconds: 300,
            }),
          });
        }

        if (typeof url === 'string' && url.includes('presigned-put')) {
          return Promise.resolve({
            ok: true,
            status: 200,
          });
        }

        if (typeof url === 'string' && url.includes('/api/media/complete')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              viewUrl: 'https://r2.mock/view-main.jpg',
              thumbnailUrl: 'https://r2.mock/view-thumb.jpg',
              media: { id: 'media-rec-1' },
              sizeBytes: 150000,
            }),
          });
        }

        return Promise.resolve({ ok: true, status: 200 });
      });

      const progressSteps: string[] = [];
      const photo = await uploadPhotoToR2({
        localUri: 'file:///photo.jpg',
        caption: 'Sunset with friends',
        ownerId: 'test-user-uuid-123',
        onProgress: (stage) => progressSteps.push(stage),
      });

      expect(imageCompressionService.compressPhotoForUpload).toHaveBeenCalled();
      expect(photo.caption).toBe('Sunset with friends');
      expect(photo.owner_id).toBe('test-user-uuid-123');
      expect(photo.main_url).toBe('https://r2.mock/view-main.jpg');
      expect(photo.thumbnail_url).toBe('https://r2.mock/view-thumb.jpg');
      expect(progressSteps).toContain('compressing');
      expect(progressSteps).toContain('uploading_main');
      expect(progressSteps).toContain('completing');

      (globalThis as any).fetch = originalFetch;
    });

    it('rejects if R2 presigned PUT fails', async () => {
      const originalFetch = (globalThis as any).fetch;

      (globalThis as any).fetch = jest.fn().mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('/api/media/upload-url')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              uploadUrl: 'https://r2.mock/failing-put',
              objectKey: 'test-user-uuid-123/photo.jpg',
            }),
          });
        }
        if (typeof url === 'string' && url.includes('failing-put')) {
          return Promise.resolve({
            ok: false,
            status: 503,
          });
        }
        return Promise.resolve({ ok: true });
      });

      await expect(
        uploadPhotoToR2({
          localUri: 'file:///photo.jpg',
          ownerId: 'test-user-uuid-123',
        })
      ).rejects.toThrow('Tải ảnh chính lên Cloudflare R2 thất bại (HTTP 503)');

      (globalThis as any).fetch = originalFetch;
    });
  });
});
