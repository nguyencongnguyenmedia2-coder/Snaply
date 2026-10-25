/**
 * SNAPLY — CLOUDFLARE R2 OBJECT STORAGE SERVICE
 * High-performance, S3-compatible, cost-effective photo storage integration.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured, Photo } from '@/lib/supabase';
import { compressPhotoForUpload, CompressionResult } from './imageCompressionService';
import { base64ToArrayBuffer, generateUUID } from './photoStorageService';

export const R2_BUCKET = 'snaply-media';
export const LOCAL_R2_PHOTOS_KEY = '@snaply_r2_local_photos';

// In-memory cache for short-lived presigned view URLs: objectKey -> { url: string, expiresAt: number }
interface SignedUrlCacheEntry {
  url: string;
  expiresAt: number; // millisecond timestamp
}
const r2UrlCache = new Map<string, SignedUrlCacheEntry>();

export function clearR2UrlCache(): void {
  r2UrlCache.clear();
}

/**
 * Determine API Base URL for backend media operations
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'https://snaplypro.vercel.app';
}

/**
 * Get or create a short-lived view URL for an R2 object key
 */
export async function getR2PhotoUrl(
  objectKey: string,
  expiresInSeconds = 3600
): Promise<string> {
  if (!objectKey) return '';
  if (objectKey.startsWith('http')) return objectKey;

  const cached = r2UrlCache.get(objectKey);
  const now = Date.now();

  if (cached && cached.expiresAt - now > 60 * 1000) {
    return cached.url;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch(`${getApiBaseUrl()}/api/media/view-url?objectKey=${encodeURIComponent(objectKey)}&expiresIn=${expiresInSeconds}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.url) {
        r2UrlCache.set(objectKey, {
          url: data.url,
          expiresAt: now + expiresInSeconds * 1000,
        });
        return data.url;
      }
    }
  } catch (err) {
    console.warn('[r2Storage] Error getting view url from backend:', err);
  }

  return objectKey;
}

/**
 * Upload photo directly to Cloudflare R2 via Presigned PUT URL
 */
export async function uploadPhotoToR2(params: {
  localUri: string;
  caption?: string;
  ownerId: string;
  groupId?: string;
  onProgress?: (stage: 'compressing' | 'getting_upload_url' | 'uploading_main' | 'uploading_thumb' | 'completing') => void;
}): Promise<Photo> {
  const { localUri, caption, ownerId, groupId, onProgress } = params;

  if (!ownerId) {
    throw new Error('Người dùng chưa đăng nhập. Không thể tải ảnh lên Cloudflare R2.');
  }

  // 1. Device-side compression
  onProgress?.('compressing');
  const compressed: CompressionResult = await compressPhotoForUpload(localUri);

  // 2. Prepare user auth token
  onProgress?.('getting_upload_url');
  let token = '';
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    token = sessionData?.session?.access_token || '';
  } catch {}

  const apiBase = getApiBaseUrl();

  // A. Request Presigned PUT URL for Main Photo
  const mainInitRes = await fetch(`${apiBase}/api/media/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      contentType: 'image/jpeg',
      sizeBytes: compressed.main.sizeBytes,
      isThumbnail: false,
    }),
  });

  if (!mainInitRes.ok) {
    const errData = await mainInitRes.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi lấy presigned PUT URL từ backend (${mainInitRes.status})`);
  }

  const { uploadUrl: mainUploadUrl, objectKey: mainKey } = await mainInitRes.json();

  // B. Upload Main Photo directly to Cloudflare R2
  onProgress?.('uploading_main');
  const mainBuffer = compressed.main.base64
    ? base64ToArrayBuffer(compressed.main.base64)
    : await (await fetch(compressed.main.uri)).arrayBuffer();

  const mainPutRes = await fetch(mainUploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: mainBuffer,
  });

  if (!mainPutRes.ok) {
    throw new Error(`Tải ảnh chính lên Cloudflare R2 thất bại (HTTP ${mainPutRes.status})`);
  }

  // C. Upload Thumbnail directly to Cloudflare R2
  onProgress?.('uploading_thumb');
  let thumbKey = '';
  try {
    const thumbInitRes = await fetch(`${apiBase}/api/media/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        contentType: 'image/jpeg',
        sizeBytes: compressed.thumbnail.sizeBytes,
        isThumbnail: true,
      }),
    });

    if (thumbInitRes.ok) {
      const { uploadUrl: thumbUploadUrl, objectKey: tKey } = await thumbInitRes.json();
      thumbKey = tKey;

      const thumbBuffer = compressed.thumbnail.base64
        ? base64ToArrayBuffer(compressed.thumbnail.base64)
        : await (await fetch(compressed.thumbnail.uri)).arrayBuffer();

      await fetch(thumbUploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: thumbBuffer,
      });
    }
  } catch (thumbErr) {
    console.warn('[r2Storage] Thumbnail upload warning:', thumbErr);
  }

  // D. Complete Upload & Register Metadata in Supabase DB
  onProgress?.('completing');
  const completeRes = await fetch(`${apiBase}/api/media/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      objectKey: mainKey,
      thumbnailKey: thumbKey || null,
      caption: caption?.trim() || null,
      groupId: groupId || null,
      width: compressed.main.width,
      height: compressed.main.height,
    }),
  });

  if (!completeRes.ok) {
    const completeErr = await completeRes.json().catch(() => ({}));
    throw new Error(completeErr.error || 'Lỗi xác nhận hoàn tất tải ảnh với backend');
  }

  const completeData = await completeRes.json();

  const photoResult: Photo = {
    id: completeData.media?.id || generateUUID(),
    owner_id: ownerId,
    object_path: mainKey,
    thumbnail_path: thumbKey || mainKey,
    caption: caption?.trim() || null,
    mime_type: 'image/jpeg',
    width: compressed.main.width,
    height: compressed.main.height,
    size_bytes: completeData.sizeBytes || compressed.main.sizeBytes,
    thumbnail_size_bytes: compressed.thumbnail.sizeBytes,
    created_at: new Date().toISOString(),
    deleted_at: null,
    thumbnail_url: completeData.thumbnailUrl || compressed.thumbnail.uri,
    main_url: completeData.viewUrl || compressed.main.uri,
  };

  // Cache locally in AsyncStorage
  try {
    const stored = await AsyncStorage.getItem(LOCAL_R2_PHOTOS_KEY);
    const list: Photo[] = stored ? JSON.parse(stored) : [];
    await AsyncStorage.setItem(LOCAL_R2_PHOTOS_KEY, JSON.stringify([photoResult, ...list]));
  } catch {}

  return photoResult;
}
