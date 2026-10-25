-- MOMO Production Database Schema & Row-Level Security
-- Version: 2026.10.25
-- Description: Complete schema for MOMO intimate moments, friends, circles, and widgets

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 25),
    CONSTRAINT username_format CHECK (username ~* '^[a-z0-9_]+$')
);

-- Index for fast username search
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 3. FRIENDSHIPS & RELATIONSHIPS
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, friend_id),
    CONSTRAINT different_users CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships(friend_id);

CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(sender_id, receiver_id),
    CONSTRAINT different_request_users CHECK (sender_id <> receiver_id)
);

CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(blocker_id, blocked_id)
);

-- 4. GROUPS & CIRCLES
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    avatar_url TEXT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);

-- 5. MOMENTS & RECIPIENTS
CREATE TABLE IF NOT EXISTS public.moments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    caption TEXT,
    media_url TEXT NOT NULL,
    group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_moments_owner ON public.moments(owner_id);
CREATE INDEX IF NOT EXISTS idx_moments_group ON public.moments(group_id);
CREATE INDEX IF NOT EXISTS idx_moments_created_at ON public.moments(created_at DESC);

-- Explicit normalized recipient list for private sharing
CREATE TABLE IF NOT EXISTS public.moment_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    moment_id UUID NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(moment_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_moment_recipients_recipient ON public.moment_recipients(recipient_id);

-- 6. REACTIONS & COMMENTS
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    moment_id UUID NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(moment_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.saved_moments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    moment_id UUID NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, moment_id)
);

-- 7. NOTIFICATIONS & DEVICE TOKENS
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('moment', 'reaction', 'friend_request', 'friend_accept', 'group_invite')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);

-- 8. WIDGET PREFERENCES & ALBUMS
CREATE TABLE IF NOT EXISTS public.widget_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    variant TEXT NOT NULL DEFAULT 'latest',
    target_id TEXT,
    theme TEXT NOT NULL DEFAULT 'system',
    photo_framing TEXT NOT NULL DEFAULT 'fill',
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cover_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.album_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    moment_id UUID NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(album_id, moment_id)
);

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    moment_id UUID REFERENCES public.moments(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moment_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Friendships
DROP POLICY IF EXISTS "Users can view own friendships" ON public.friendships;
CREATE POLICY "Users can view own friendships"
ON public.friendships FOR SELECT TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can insert own friendships" ON public.friendships;
CREATE POLICY "Users can insert own friendships"
ON public.friendships FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can delete own friendships" ON public.friendships;
CREATE POLICY "Users can delete own friendships"
ON public.friendships FOR DELETE TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 3. Friend Requests
DROP POLICY IF EXISTS "Users can view relevant friend requests" ON public.friend_requests;
CREATE POLICY "Users can view relevant friend requests"
ON public.friend_requests FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friend_requests;
CREATE POLICY "Users can send friend requests"
ON public.friend_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Receiver can update request status" ON public.friend_requests;
CREATE POLICY "Receiver can update request status"
ON public.friend_requests FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id);

-- 4. Groups & Members
DROP POLICY IF EXISTS "Groups viewable by members" ON public.groups;
CREATE POLICY "Groups viewable by members"
ON public.groups FOR SELECT TO authenticated
USING (auth.uid() = owner_id OR EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
CREATE POLICY "Users can create groups"
ON public.groups FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Members can view circle members" ON public.group_members;
CREATE POLICY "Members can view circle members"
ON public.group_members FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.groups WHERE groups.id = group_members.group_id AND (groups.owner_id = auth.uid() OR group_members.user_id = auth.uid())));

-- 5. Moments
DROP POLICY IF EXISTS "Moments viewable by authorized circle" ON public.moments;
CREATE POLICY "Moments viewable by authorized circle"
ON public.moments FOR SELECT TO authenticated
USING (
    auth.uid() = owner_id
    OR EXISTS (
        SELECT 1 FROM public.moment_recipients
        WHERE moment_recipients.moment_id = moments.id
        AND moment_recipients.recipient_id = auth.uid()
    )
    OR (
        moments.group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = moments.group_id
            AND group_members.user_id = auth.uid()
        )
    )
    OR (
        moments.group_id IS NULL AND EXISTS (
            SELECT 1 FROM public.friendships
            WHERE (friendships.user_id = moments.owner_id AND friendships.friend_id = auth.uid())
               OR (friendships.friend_id = moments.owner_id AND friendships.user_id = auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "Users can insert own moments" ON public.moments;
CREATE POLICY "Users can insert own moments"
ON public.moments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own moments" ON public.moments;
CREATE POLICY "Users can delete own moments"
ON public.moments FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

-- 6. Moment Recipients
DROP POLICY IF EXISTS "View moment recipients" ON public.moment_recipients;
CREATE POLICY "View moment recipients"
ON public.moment_recipients FOR SELECT TO authenticated
USING (
    recipient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.moments WHERE moments.id = moment_recipients.moment_id AND moments.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Insert recipients for own moments" ON public.moment_recipients;
CREATE POLICY "Insert recipients for own moments"
ON public.moment_recipients FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.moments WHERE moments.id = moment_recipients.moment_id AND moments.owner_id = auth.uid())
);

-- 7. Reactions
DROP POLICY IF EXISTS "Reactions viewable by authorized users" ON public.reactions;
CREATE POLICY "Reactions viewable by authorized users"
ON public.reactions FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.moments
        WHERE moments.id = reactions.moment_id
    )
);

DROP POLICY IF EXISTS "Users can create own reaction" ON public.reactions;
CREATE POLICY "Users can create own reaction"
ON public.reactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reaction" ON public.reactions;
CREATE POLICY "Users can delete own reaction"
ON public.reactions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 8. Device Tokens
DROP POLICY IF EXISTS "Users can manage own device tokens" ON public.device_tokens;
CREATE POLICY "Users can manage own device tokens"
ON public.device_tokens FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 9. Widget Preferences
DROP POLICY IF EXISTS "Users can manage own widget preferences" ON public.widget_preferences;
CREATE POLICY "Users can manage own widget preferences"
ON public.widget_preferences FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 10. Saved Moments & Albums
DROP POLICY IF EXISTS "Users can manage saved moments" ON public.saved_moments;
CREATE POLICY "Users can manage saved moments"
ON public.saved_moments FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage albums" ON public.albums;
CREATE POLICY "Users can manage albums"
ON public.albums FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 11. Reports & Subscriptions
DROP POLICY IF EXISTS "Users can submit reports" ON public.reports;
CREATE POLICY "Users can submit reports"
ON public.reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 12. Storage Configuration (Bucket: moments)
INSERT INTO storage.buckets (id, name, public)
VALUES ('moments', 'moments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload own moments" ON storage.objects;
CREATE POLICY "Authenticated users can upload own moments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'moments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authorized users can read moments" ON storage.objects;
CREATE POLICY "Authorized users can read moments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'moments');
