-- Migration: 20261025060000_cloudflare_r2_media.sql
-- Description: Media Assets Table for Cloudflare R2 Integration with Strict RLS

CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_provider TEXT NOT NULL DEFAULT 'cloudflare_r2' CHECK (storage_provider IN ('cloudflare_r2', 'supabase_storage')),
    bucket_name TEXT NOT NULL DEFAULT 'snaply-media',
    object_key TEXT UNIQUE NOT NULL,
    thumbnail_key TEXT,
    content_type TEXT NOT NULL DEFAULT 'image/jpeg',
    size_bytes BIGINT NOT NULL DEFAULT 0,
    width INT,
    height INT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'ready', 'failed', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast feed and owner queries
CREATE INDEX IF NOT EXISTS idx_media_assets_owner ON public.media_assets(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON public.media_assets(status) WHERE status = 'ready';
CREATE INDEX IF NOT EXISTS idx_media_assets_key ON public.media_assets(object_key);

-- Enable Row Level Security
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own media or media shared with them through moments
DROP POLICY IF EXISTS "Users can read own media assets" ON public.media_assets;
CREATE POLICY "Users can read own media assets"
    ON public.media_assets FOR SELECT
    USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.friendships
            WHERE (user_id = auth.uid() AND friend_id = media_assets.owner_id)
               OR (friend_id = auth.uid() AND user_id = media_assets.owner_id)
        )
    );

-- Policy 2: Users can only insert media records where they are the owner
DROP POLICY IF EXISTS "Users can insert own media assets" ON public.media_assets;
CREATE POLICY "Users can insert own media assets"
    ON public.media_assets FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Policy 3: Users can only update their own media assets
DROP POLICY IF EXISTS "Users can update own media assets" ON public.media_assets;
CREATE POLICY "Users can update own media assets"
    ON public.media_assets FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Policy 4: Users can delete their own media assets
DROP POLICY IF EXISTS "Users can delete own media assets" ON public.media_assets;
CREATE POLICY "Users can delete own media assets"
    ON public.media_assets FOR DELETE
    USING (auth.uid() = owner_id);
