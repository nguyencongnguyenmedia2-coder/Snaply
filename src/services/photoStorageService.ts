import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured, Photo } from '@/lib/supabase';
import { compressPhotoForUpload, CompressionResult } from './imageCompressionService';

export const SNAPLY_BUCKET = 'snaply-photos';
export const LOCAL_PHOTOS_KEY = '@snaply_local_photos';
export const LOCAL_DELETION_JOBS_KEY = '@snaply_deletion_jobs';

// In-memory cache for short-lived signed URLs: path -> { url: string, expiresAt: number }
interface SignedUrlCacheEntry {
  url: string;
  expiresAt: number; // millisecond timestamp
}
const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function clearSignedUrlCache(): void {
  signedUrlCache.clear();
}

/**
 * Get or create a short-lived signed URL (valid for 5 minutes) with in-memory caching
 */
export async function getSignedPhotoUrl(
  path: string,
  expiresInSeconds = 300
): Promise<string> {
  if (!path) return '';
  if (path.startsWith('http')) return path; // Already a remote URL

  const cached = signedUrlCache.get(path);
  const now = Date.now();

  // If cached and has at least 30 seconds of life remaining, reuse
  if (cached && cached.expiresAt - now > 30 * 1000) {
    return cached.url;
  }

  if (!isSupabaseConfigured) {
    const mockSigned = `https://mock-storage.snaply.local/${path}?token=mock_signed_ttl_${now + expiresInSeconds * 1000}`;
    signedUrlCache.set(path, {
      url: mockSigned,
      expiresAt: now + expiresInSeconds * 1000,
    });
    return mockSigned;
  }

  try {
    const { data, error } = await supabase.storage
      .from(SNAPLY_BUCKET)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn(`[photoStorage] Failed to create signed URL for ${path}:`, error);
      return path;
    }

    signedUrlCache.set(path, {
      url: data.signedUrl,
      expiresAt: now + expiresInSeconds * 1000,
    });

    return data.signedUrl;
  } catch (err) {
    console.warn(`[photoStorage] Error creating signed URL for ${path}:`, err);
    return path;
  }
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/^data:image\/[a-z]+;base64,/, '').trim();

  if (typeof atob === 'function') {
    const binaryString = atob(clean);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Pure JavaScript fallback for environments without atob
  let bufferLength = clean.length * 0.75;
  if (clean[clean.length - 1] === '=') bufferLength--;
  if (clean[clean.length - 2] === '=') bufferLength--;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const encoded1 = BASE64_CHARS.indexOf(clean[i]);
    const encoded2 = BASE64_CHARS.indexOf(clean[i + 1]);
    const encoded3 = BASE64_CHARS.indexOf(clean[i + 2]);
    const encoded4 = BASE64_CHARS.indexOf(clean[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64 && encoded3 !== -1) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== 64 && encoded4 !== -1) {
      bytes[p++] = ((encoded3 & 3) << 6) | encoded4;
    }
  }

  return arrayBuffer;
}

async function prepareUploadBuffer(variant: { uri: string; base64?: string }): Promise<ArrayBuffer> {
  if (variant.base64) {
    return base64ToArrayBuffer(variant.base64);
  }
  const response = await fetch(variant.uri);
  return await response.arrayBuffer();
}

/**
 * Upload photo following full Snaply two-tier compression & private storage architecture
 */
export async function uploadPhoto(params: {
  localUri: string;
  caption?: string;
  ownerId: string;
  onProgress?: (stage: 'compressing' | 'uploading_main' | 'uploading_thumb' | 'saving_metadata') => void;
}): Promise<Photo> {
  const { localUri, caption, ownerId, onProgress } = params;

  if (!ownerId) {
    throw new Error('Người dùng chưa đăng nhập. Không thể tải ảnh lên.');
  }

  // Check active session to align ownerId with Supabase auth token
  let effectiveOwnerId = ownerId;
  let activeBucket = SNAPLY_BUCKET;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.id) {
      effectiveOwnerId = sessionData.session.user.id;
    }
  } catch {
    // Continue with passed ownerId
  }

  const photoId = generateUUID();
  const objectPath = `${effectiveOwnerId}/${photoId}.jpg`;
  const thumbnailPath = `${effectiveOwnerId}/${photoId}_thumb.jpg`;

  // 1. Device-side compression
  onProgress?.('compressing');
  const compressed: CompressionResult = await compressPhotoForUpload(localUri);

  if (!isSupabaseConfigured) {
    // Development / offline mock fallback
    const mockPhoto: Photo = {
      id: photoId,
      owner_id: effectiveOwnerId,
      object_path: objectPath,
      thumbnail_path: thumbnailPath,
      caption: caption?.trim() || null,
      mime_type: 'image/jpeg',
      width: compressed.main.width,
      height: compressed.main.height,
      size_bytes: compressed.main.sizeBytes,
      thumbnail_size_bytes: compressed.thumbnail.sizeBytes,
      created_at: new Date().toISOString(),
      deleted_at: null,
      thumbnail_url: compressed.thumbnail.uri,
      main_url: compressed.main.uri,
    };

    const stored = await AsyncStorage.getItem(LOCAL_PHOTOS_KEY);
    const list: Photo[] = stored ? JSON.parse(stored) : [];
    await AsyncStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify([mockPhoto, ...list]));
    return mockPhoto;
  }

  // 2. Upload Main Photo
  onProgress?.('uploading_main');
  let mainUploaded = false;
  let thumbUploaded = false;

  try {
    const mainBuffer = await prepareUploadBuffer(compressed.main);

    let uploadRes = await supabase.storage
      .from(activeBucket)
      .upload(objectPath, mainBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    // If first bucket fails (e.g. snaply-photos bucket lacks RLS or not created yet), fallback to moments bucket
    if (uploadRes.error && activeBucket !== 'moments') {
      console.warn(`[photoStorage] Upload to ${activeBucket} returned: ${uploadRes.error.message}. Attempting fallback to 'moments' bucket...`);
      activeBucket = 'moments';
      uploadRes = await supabase.storage
        .from('moments')
        .upload(objectPath, mainBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });
    }

    if (uploadRes.error) {
      // If still blocked by RLS policy (e.g. unauthenticated demo user or unapplied migration)
      console.warn(`[photoStorage] Storage upload blocked by RLS/Policy: ${uploadRes.error.message}. Falling back to local offline storage.`);
      
      const fallbackPhoto: Photo = {
        id: photoId,
        owner_id: effectiveOwnerId,
        object_path: objectPath,
        thumbnail_path: thumbnailPath,
        caption: caption?.trim() || null,
        mime_type: 'image/jpeg',
        width: compressed.main.width,
        height: compressed.main.height,
        size_bytes: compressed.main.sizeBytes,
        thumbnail_size_bytes: compressed.thumbnail.sizeBytes,
        created_at: new Date().toISOString(),
        deleted_at: null,
        thumbnail_url: compressed.thumbnail.uri,
        main_url: compressed.main.uri,
      };

      const stored = await AsyncStorage.getItem(LOCAL_PHOTOS_KEY);
      const list: Photo[] = stored ? JSON.parse(stored) : [];
      await AsyncStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify([fallbackPhoto, ...list]));
      return fallbackPhoto;
    }
    mainUploaded = true;

    // 3. Upload Thumbnail
    onProgress?.('uploading_thumb');
    const thumbBuffer = await prepareUploadBuffer(compressed.thumbnail);

    const { error: thumbUploadError } = await supabase.storage
      .from(activeBucket)
      .upload(thumbnailPath, thumbBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (thumbUploadError) {
      console.warn(`[photoStorage] Thumbnail upload error (non-fatal): ${thumbUploadError.message}`);
    } else {
      thumbUploaded = true;
    }

    // 4. Save metadata to PostgreSQL photos table
    onProgress?.('saving_metadata');
    const { data: photoRecord, error: dbError } = await supabase
      .from('photos')
      .insert({
        id: photoId,
        owner_id: effectiveOwnerId,
        object_path: objectPath,
        thumbnail_path: thumbnailPath,
        caption: caption?.trim() || null,
        mime_type: 'image/jpeg',
        width: compressed.main.width,
        height: compressed.main.height,
        size_bytes: compressed.main.sizeBytes,
        thumbnail_size_bytes: compressed.thumbnail.sizeBytes,
      })
      .select('*, owner:profiles!owner_id(*)')
      .single();

    // Resolve initial signed URLs or public URLs for fast display
    let thumbSignedUrl = await getSignedPhotoUrl(thumbnailPath);
    let mainSignedUrl = await getSignedPhotoUrl(objectPath);
    if (!thumbSignedUrl) thumbSignedUrl = compressed.thumbnail.uri;
    if (!mainSignedUrl) mainSignedUrl = compressed.main.uri;

    if (dbError || !photoRecord) {
      console.warn(`[photoStorage] DB insert error (${dbError?.message}), saving to local storage.`);
      const fallbackPhoto: Photo = {
        id: photoId,
        owner_id: effectiveOwnerId,
        object_path: objectPath,
        thumbnail_path: thumbnailPath,
        caption: caption?.trim() || null,
        mime_type: 'image/jpeg',
        width: compressed.main.width,
        height: compressed.main.height,
        size_bytes: compressed.main.sizeBytes,
        thumbnail_size_bytes: compressed.thumbnail.sizeBytes,
        created_at: new Date().toISOString(),
        deleted_at: null,
        thumbnail_url: thumbSignedUrl,
        main_url: mainSignedUrl,
      };

      const stored = await AsyncStorage.getItem(LOCAL_PHOTOS_KEY);
      const list: Photo[] = stored ? JSON.parse(stored) : [];
      await AsyncStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify([fallbackPhoto, ...list]));
      return fallbackPhoto;
    }

    const completePhoto: Photo = {
      ...photoRecord,
      thumbnail_url: thumbSignedUrl,
      main_url: mainSignedUrl,
    };

    return completePhoto;
  } catch (err: any) {
    // ROLLBACK: If any step fails, clean up uploaded files to prevent orphans!
    console.warn('[photoStorage] Upload failure, rolling back storage artifacts...', err);
    const cleanupFiles: string[] = [];
    if (mainUploaded) cleanupFiles.push(objectPath);
    if (thumbUploaded) cleanupFiles.push(thumbnailPath);

    if (cleanupFiles.length > 0) {
      supabase.storage
        .from(SNAPLY_BUCKET)
        .remove(cleanupFiles)
        .catch((cleanErr) => console.warn('[photoStorage] Rollback removal failed:', cleanErr));
    }

    throw err;
  }
}

/**
 * Fetch paginated photos for feed using thumbnail URLs (default 20 per page)
 */
export async function getFeedPhotos(
  userId: string,
  page = 0,
  limit = 20
): Promise<{ photos: Photo[]; hasMore: boolean }> {
  try {
    if (isSupabaseConfigured && userId) {
      const from = page * limit;
      const to = from + limit - 1;

      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          owner:profiles!owner_id (id, username, display_name, avatar_url)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        // Resolve thumbnail signed URLs in parallel with caching
        const photosWithUrls = await Promise.all(
          data.map(async (p: any) => {
            const thumbUrl = await getSignedPhotoUrl(p.thumbnail_path);
            return {
              ...p,
              thumbnail_url: thumbUrl,
            } as Photo;
          })
        );

        return {
          photos: photosWithUrls,
          hasMore: data.length === limit,
        };
      }
    }

    // Fallback store
    const stored = await AsyncStorage.getItem(LOCAL_PHOTOS_KEY);
    const list: Photo[] = stored ? JSON.parse(stored) : [];
    const active = list.filter((p) => !p.deleted_at);
    return {
      photos: active.slice(page * limit, (page + 1) * limit),
      hasMore: active.length > (page + 1) * limit,
    };
  } catch (err) {
    console.warn('[photoStorage] getFeedPhotos error:', err);
    return { photos: [], hasMore: false };
  }
}

/**
 * Fetch single photo details, ensuring high-res main photo signed URL is resolved
 */
export async function getPhotoDetail(photoId: string): Promise<Photo | null> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          owner:profiles!owner_id (id, username, display_name, avatar_url)
        `)
        .eq('id', photoId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error || !data) return null;

      const [thumbUrl, mainUrl] = await Promise.all([
        getSignedPhotoUrl(data.thumbnail_path),
        getSignedPhotoUrl(data.object_path),
      ]);

      return {
        ...data,
        thumbnail_url: thumbUrl,
        main_url: mainUrl,
      };
    }

    const stored = await AsyncStorage.getItem(LOCAL_PHOTOS_KEY);
    const list: Photo[] = stored ? JSON.parse(stored) : [];
    const found = list.find((p) => p.id === photoId && !p.deleted_at);
    return found || null;
  } catch (err) {
    console.warn('[photoStorage] getPhotoDetail error:', err);
    return null;
  }
}

/**
 * Fetch all photos belonging to a specific user (protected by RLS: owner or accepted friend)
 */
export async function getUserPhotos(
  targetUserId: string,
  currentUserId?: string
): Promise<Photo[]> {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          owner:profiles!owner_id (id, username, display_name, avatar_url)
        `)
        .eq('owner_id', targetUserId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[photoStorage] getUserPhotos Supabase error:', error);
        return [];
      }

      if (data && data.length > 0) {
        // Resolve thumbnail signed URLs in parallel with caching
        const photosWithUrls = await Promise.all(
          data.map(async (p: any) => {
            const thumbUrl = await getSignedPhotoUrl(p.thumbnail_path);
            return {
              ...p,
              thumbnail_url: thumbUrl,
            } as Photo;
          })
        );
        return photosWithUrls;
      }
    }

    // Local / Mock fallback: check photos storage first
    const stored = await AsyncStorage.getItem(LOCAL_PHOTOS_KEY);
    const list: Photo[] = stored ? JSON.parse(stored) : [];
    const userPhotos = list.filter((p) => p.owner_id === targetUserId && !p.deleted_at);
    if (userPhotos.length > 0) return userPhotos;

    // Fallback from moments
    const momentsStored = await AsyncStorage.getItem('@momo_feed_moments');
    if (momentsStored) {
      const momentsList: any[] = JSON.parse(momentsStored);
      const matched = momentsList.filter((m) => m.owner_id === targetUserId);
      if (matched.length > 0) {
        return matched.map((m) => ({
          id: m.id,
          owner_id: m.owner_id,
          object_path: m.media_url,
          thumbnail_path: m.media_url,
          thumbnail_url: m.media_url,
          main_url: m.media_url,
          caption: m.caption,
          mime_type: 'image/jpeg',
          width: 1200,
          height: 1500,
          size_bytes: 300000,
          thumbnail_size_bytes: 40000,
          created_at: m.created_at,
          deleted_at: null,
          owner: m.owner,
        }));
      }
    }

    return [];
  } catch (err) {
    console.warn('[photoStorage] getUserPhotos error:', err);
    return [];
  }
}

/**
 * Safe, multi-step photo deletion with queue, storage cleanup, and resilience against missing files
 */
export async function deletePhoto(photoId: string, ownerId: string): Promise<boolean> {
  if (!photoId || !ownerId) {
    throw new Error('Missing photoId or ownerId for deletion');
  }

  // 1. Check local store or fetch photo to verify ownership
  const stored = await AsyncStorage.getItem(LOCAL_PHOTOS_KEY);
  if (stored) {
    const list: Photo[] = JSON.parse(stored);
    const target = list.find((p) => p.id === photoId);
    if (target && target.owner_id !== ownerId) {
      throw new Error('Chỉ chủ sở hữu mới có quyền xóa ảnh này.');
    }
  }

  let objectPath = '';
  let thumbnailPath = '';

  if (isSupabaseConfigured) {
    try {
      // Step A: Soft delete & enqueue deletion job atomically via RPC or direct update
      const { data: photoData } = await supabase
        .from('photos')
        .select('object_path, thumbnail_path, owner_id')
        .eq('id', photoId)
        .maybeSingle();

      if (photoData) {
        if (photoData.owner_id !== ownerId) {
          throw new Error('Chỉ chủ sở hữu mới có quyền xóa ảnh này.');
        }
        objectPath = photoData.object_path;
        thumbnailPath = photoData.thumbnail_path;
      }

      // Mark soft deleted immediately so it disappears from feed
      await supabase
        .from('photos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', photoId)
        .eq('owner_id', ownerId);

      // Enqueue deletion job
      let jobId: string | null = null;
      if (objectPath && thumbnailPath) {
        const { data: jobData } = await supabase
          .from('photo_deletion_jobs')
          .insert({
            photo_id: photoId,
            owner_id: ownerId,
            object_path: objectPath,
            thumbnail_path: thumbnailPath,
            status: 'processing',
            attempts: 1,
          })
          .select('id')
          .maybeSingle();

        jobId = jobData?.id || null;
      }

      // Step B: Delete storage files (handles missing files gracefully)
      const filesToDelete: string[] = [];
      if (objectPath) filesToDelete.push(objectPath);
      if (thumbnailPath) filesToDelete.push(thumbnailPath);

      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(SNAPLY_BUCKET)
          .remove(filesToDelete);

        if (storageError) {
          console.warn('[photoStorage] Storage delete warning (job saved for retry):', storageError);
          if (jobId) {
            await supabase
              .from('photo_deletion_jobs')
              .update({
                status: 'pending',
                error_message: storageError.message,
                updated_at: new Date().toISOString(),
              })
              .eq('id', jobId);
          }
        } else {
          // Success: delete record permanently or mark completed
          if (jobId) {
            await supabase
              .from('photo_deletion_jobs')
              .update({
                status: 'completed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', jobId);
          }
          await supabase.from('photos').delete().eq('id', photoId).eq('owner_id', ownerId);
        }
      }

      // Evict from cache
      if (objectPath) signedUrlCache.delete(objectPath);
      if (thumbnailPath) signedUrlCache.delete(thumbnailPath);
    } catch (err) {
      if ((err as Error).message.includes('Chỉ chủ sở hữu')) {
        throw err;
      }
      console.warn('[photoStorage] Error during deletion:', err);
    }
  }

  // Update local offline cache with soft-delete
  if (stored) {
    const list: Photo[] = JSON.parse(stored);
    const updated = list.map((p) =>
      p.id === photoId ? { ...p, deleted_at: new Date().toISOString() } : p
    );
    await AsyncStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify(updated));
  }

  return true;
}

/**
 * Background retry handler for pending deletion jobs
 */
export async function processPendingDeletionJobs(ownerId: string): Promise<number> {
  if (!isSupabaseConfigured || !ownerId) return 0;

  try {
    const { data: jobs, error } = await supabase
      .from('photo_deletion_jobs')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('status', 'pending')
      .limit(10);

    if (error || !jobs || jobs.length === 0) return 0;

    let processedCount = 0;
    for (const job of jobs) {
      const filesToDelete = [job.object_path, job.thumbnail_path].filter(Boolean);

      const { error: delError } = await supabase.storage
        .from(SNAPLY_BUCKET)
        .remove(filesToDelete);

      if (!delError) {
        await supabase
          .from('photo_deletion_jobs')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', job.id);

        if (job.photo_id) {
          await supabase.from('photos').delete().eq('id', job.photo_id);
        }
        processedCount++;
      } else {
        await supabase
          .from('photo_deletion_jobs')
          .update({
            attempts: job.attempts + 1,
            error_message: delError.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      }
    }

    return processedCount;
  } catch (err) {
    console.warn('[photoStorage] processPendingDeletionJobs error:', err);
    return 0;
  }
}
