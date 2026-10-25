-- Snaply Photo Storage & Friendship Security Migration
-- Version: 20261025010000
-- Description: Implement Snaply photo storage, two-tier compression paths, friendships schema, deletion queue, and private bucket RLS

-- 1. PRIVATE STORAGE BUCKET: snaply-photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'snaply-photos',
    'snaply-photos',
    false,
    10485760, -- 10MB maximum file size limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. ENHANCED FRIENDSHIPS TABLE
-- Ensure friendships adhere to user_low < user_high ordering
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_low UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_high UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT check_user_order CHECK (user_low < user_high),
    CONSTRAINT unique_friendship_pair UNIQUE (user_low, user_high),
    CONSTRAINT check_requested_by CHECK (requested_by = user_low OR requested_by = user_high)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_low ON public.friendships(user_low);
CREATE INDEX IF NOT EXISTS idx_friendships_user_high ON public.friendships(user_high);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- Helper function: Check if two users are accepted friends
CREATE OR REPLACE FUNCTION public.are_friends_accepted(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (
      (user_low = LEAST(user_a, user_b) AND user_high = GREATEST(user_a, user_b))
    )
    AND status = 'accepted'
  );
$$;

-- 3. PHOTOS TABLE (Metadata & Storage Paths)
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    object_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    caption TEXT,
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    width INTEGER,
    height INTEGER,
    size_bytes BIGINT,
    thumbnail_size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_photos_owner_created ON public.photos(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_created_active ON public.photos(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_photos_object_path ON public.photos(object_path);

-- 4. PHOTO DELETION JOBS QUEUE
CREATE TABLE IF NOT EXISTS public.photo_deletion_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    object_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photo_deletion_jobs_owner ON public.photo_deletion_jobs(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_photo_deletion_jobs_status ON public.photo_deletion_jobs(status) WHERE status = 'pending';

-- 5. ROW LEVEL SECURITY POLICIES

-- (A) Friendships RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their friendships" ON public.friendships;
CREATE POLICY "Participants can view their friendships"
ON public.friendships FOR SELECT TO authenticated
USING (auth.uid() = user_low OR auth.uid() = user_high);

DROP POLICY IF EXISTS "Users can send friendship requests" ON public.friendships;
CREATE POLICY "Users can send friendship requests"
ON public.friendships FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = requested_by
    AND (auth.uid() = user_low OR auth.uid() = user_high)
    AND status = 'pending'
);

DROP POLICY IF EXISTS "Receivers can update friendship status" ON public.friendships;
CREATE POLICY "Receivers can update friendship status"
ON public.friendships FOR UPDATE TO authenticated
USING (
    -- Only the recipient (not the requester) can change status
    auth.uid() != requested_by
    AND (auth.uid() = user_low OR auth.uid() = user_high)
)
WITH CHECK (
    auth.uid() != requested_by
    AND (auth.uid() = user_low OR auth.uid() = user_high)
    AND (
        (status = 'accepted')
        OR (status = 'rejected')
        OR (status = 'blocked')
    )
);

DROP POLICY IF EXISTS "Participants can delete friendships" ON public.friendships;
CREATE POLICY "Participants can delete friendships"
ON public.friendships FOR DELETE TO authenticated
USING (auth.uid() = user_low OR auth.uid() = user_high);

-- (B) Photos RLS
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and accepted friends can read photos" ON public.photos;
CREATE POLICY "Owners and accepted friends can read photos"
ON public.photos FOR SELECT TO authenticated
USING (
    auth.uid() = owner_id
    OR (
        deleted_at IS NULL
        AND public.are_friends_accepted(auth.uid(), owner_id)
    )
);

DROP POLICY IF EXISTS "Users can insert own photos" ON public.photos;
CREATE POLICY "Users can insert own photos"
ON public.photos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own photos" ON public.photos;
CREATE POLICY "Users can update own photos"
ON public.photos FOR UPDATE TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own photos" ON public.photos;
CREATE POLICY "Users can delete own photos"
ON public.photos FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

-- (C) Photo Deletion Jobs RLS
ALTER TABLE public.photo_deletion_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own deletion jobs" ON public.photo_deletion_jobs;
CREATE POLICY "Users can view own deletion jobs"
ON public.photo_deletion_jobs FOR SELECT TO authenticated
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert own deletion jobs" ON public.photo_deletion_jobs;
CREATE POLICY "Users can insert own deletion jobs"
ON public.photo_deletion_jobs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own deletion jobs" ON public.photo_deletion_jobs;
CREATE POLICY "Users can update own deletion jobs"
ON public.photo_deletion_jobs FOR UPDATE TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- (D) Storage Objects Policies for snaply-photos
DROP POLICY IF EXISTS "Users can upload photos to own directory" ON storage.objects;
CREATE POLICY "Users can upload photos to own directory"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'snaply-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Owners and friends can view photos" ON storage.objects;
CREATE POLICY "Owners and friends can view photos"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'snaply-photos'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.are_friends_accepted(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
);

DROP POLICY IF EXISTS "Owners can delete own photos from storage" ON storage.objects;
CREATE POLICY "Owners can delete own photos from storage"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'snaply-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. RPC FUNCTIONS FOR SECURE OPERATIONS

-- Safe friend request handler
CREATE OR REPLACE FUNCTION public.send_friend_request(p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_low UUID;
    v_high UUID;
    v_record RECORD;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF v_caller_id = p_target_user_id THEN
        RAISE EXCEPTION 'Cannot friend yourself';
    END IF;

    v_low := LEAST(v_caller_id, p_target_user_id);
    v_high := GREATEST(v_caller_id, p_target_user_id);

    SELECT * INTO v_record FROM public.friendships WHERE user_low = v_low AND user_high = v_high;

    IF v_record.id IS NOT NULL THEN
        IF v_record.status = 'accepted' THEN
            RETURN jsonb_build_object('success', true, 'status', 'already_accepted');
        ELSIF v_record.status = 'blocked' THEN
            RAISE EXCEPTION 'Cannot send friend request';
        ELSE
            -- Refresh request
            UPDATE public.friendships
            SET requested_by = v_caller_id, status = 'pending', updated_at = NOW()
            WHERE id = v_record.id;
            RETURN jsonb_build_object('success', true, 'status', 'pending');
        END IF;
    ELSE
        INSERT INTO public.friendships (user_low, user_high, requested_by, status)
        VALUES (v_low, v_high, v_caller_id, 'pending');
        RETURN jsonb_build_object('success', true, 'status', 'pending');
    END IF;
END;
$$;

-- Safe friendship status response (Accept / Reject)
CREATE OR REPLACE FUNCTION public.respond_friend_request(p_friendship_id UUID, p_accept BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_record RECORD;
    v_new_status TEXT;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_record FROM public.friendships WHERE id = p_friendship_id;

    IF v_record.id IS NULL THEN
        RAISE EXCEPTION 'Friendship request not found';
    END IF;

    -- Caller MUST be the recipient, never the original requester
    IF v_record.requested_by = v_caller_id THEN
        RAISE EXCEPTION 'Requester cannot accept own friend request';
    END IF;

    IF v_record.user_low != v_caller_id AND v_record.user_high != v_caller_id THEN
        RAISE EXCEPTION 'Not authorized to respond to this request';
    END IF;

    IF p_accept THEN
        v_new_status := 'accepted';
    ELSE
        v_new_status := 'rejected';
    END IF;

    UPDATE public.friendships
    SET status = v_new_status, updated_at = NOW()
    WHERE id = p_friendship_id;

    RETURN jsonb_build_object('success', true, 'status', v_new_status);
END;
$$;

-- Safe soft delete & queue photo deletion
CREATE OR REPLACE FUNCTION public.soft_delete_and_queue_photo(p_photo_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_photo RECORD;
    v_job_id UUID;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_photo FROM public.photos WHERE id = p_photo_id AND owner_id = v_caller_id;

    IF v_photo.id IS NULL THEN
        RAISE EXCEPTION 'Photo not found or you lack permission';
    END IF;

    -- Mark photo as deleted
    UPDATE public.photos
    SET deleted_at = NOW()
    WHERE id = p_photo_id;

    -- Create deletion job
    INSERT INTO public.photo_deletion_jobs (photo_id, owner_id, object_path, thumbnail_path, status)
    VALUES (p_photo_id, v_caller_id, v_photo.object_path, v_photo.thumbnail_path, 'pending')
    RETURNING id INTO v_job_id;

    RETURN jsonb_build_object('success', true, 'job_id', v_job_id, 'photo_id', p_photo_id);
END;
$$;
