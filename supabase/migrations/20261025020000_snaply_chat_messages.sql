-- Snaply Realtime Chat & Group Messaging Schema
-- Migration: 20261025020000_snaply_chat_messages.sql

-- 1. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    content TEXT,
    media_url TEXT,
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reactions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_message_target CHECK (
        (group_id IS NOT NULL AND receiver_id IS NULL) OR
        (group_id IS NULL AND receiver_id IS NOT NULL)
    ),
    CONSTRAINT chk_message_has_content CHECK (
        content IS NOT NULL OR media_url IS NOT NULL
    )
);

-- Indexes for lightning fast queries (Optimistic UI & Realtime load)
CREATE INDEX IF NOT EXISTS idx_messages_group_created ON public.messages(group_id, created_at DESC) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_direct_created ON public.messages(sender_id, receiver_id, created_at DESC) WHERE group_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Select messages (User is sender/receiver for direct chat, or is member of group for group chat)
DROP POLICY IF EXISTS "Users can read authorized direct and group messages" ON public.messages;
CREATE POLICY "Users can read authorized direct and group messages"
    ON public.messages
    FOR SELECT
    USING (
        -- Direct message participant
        (group_id IS NULL AND (auth.uid() = sender_id OR auth.uid() = receiver_id))
        OR
        -- Group member
        (group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = messages.group_id AND gm.user_id = auth.uid()
        ))
    );

-- Policy: Insert messages (User is sender and target is valid friend or group they belong to)
DROP POLICY IF EXISTS "Users can send direct or group messages" ON public.messages;
CREATE POLICY "Users can send direct or group messages"
    ON public.messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND (
            -- If group, user must be a member
            (group_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.group_members gm
                WHERE gm.group_id = messages.group_id AND gm.user_id = auth.uid()
            ))
            OR
            -- If direct message, must have friendship or self
            (group_id IS NULL AND receiver_id IS NOT NULL)
        )
    );

-- Policy: Update messages (e.g. updating reactions)
DROP POLICY IF EXISTS "Users can update reactions on visible messages" ON public.messages;
CREATE POLICY "Users can update reactions on visible messages"
    ON public.messages
    FOR UPDATE
    USING (
        (group_id IS NULL AND (auth.uid() = sender_id OR auth.uid() = receiver_id))
        OR
        (group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = messages.group_id AND gm.user_id = auth.uid()
        ))
    );

-- 3. ENABLE SUPABASE REALTIME REPLICATION FOR MESSAGES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;
