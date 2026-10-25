-- Snaply Admin CRM & Ecosystem Management Schema
-- Migration: 20261025030000_snaply_admin_crm.sql
-- Description: RBAC, Audit Logs, Moderation Workflow, Support Tickets, Feature Flags, and App Releases

-- 1. EXTEND EXISTING TABLES SAFELY
DO $$ 
BEGIN
    -- Add status & ban fields to profiles if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status') THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'ban_reason') THEN
        ALTER TABLE public.profiles ADD COLUMN ban_reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'banned_at') THEN
        ALTER TABLE public.profiles ADD COLUMN banned_at TIMESTAMPTZ;
    END IF;

    -- Add is_hidden to moments if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'moments' AND column_name = 'is_hidden') THEN
        ALTER TABLE public.moments ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'moments' AND column_name = 'hidden_reason') THEN
        ALTER TABLE public.moments ADD COLUMN hidden_reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'moments' AND column_name = 'hidden_by') THEN
        ALTER TABLE public.moments ADD COLUMN hidden_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Add moderation columns to reports if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'status') THEN
        ALTER TABLE public.reports ADD COLUMN status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'escalated', 'resolved', 'rejected'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'priority') THEN
        ALTER TABLE public.reports ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'assigned_to') THEN
        ALTER TABLE public.reports ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'resolution_notes') THEN
        ALTER TABLE public.reports ADD COLUMN resolution_notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'resolved_at') THEN
        ALTER TABLE public.reports ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. ADMIN ROLES (RBAC)
CREATE TABLE IF NOT EXISTS public.admin_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN (
        'super_admin',
        'operations_admin',
        'support_agent',
        'content_moderator',
        'analyst',
        'read_only'
    )),
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for instant role checks
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON public.admin_roles(role) WHERE is_active = TRUE;

-- 3. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_email TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    reason TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON public.admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);

-- 4. SUPPORT TICKETS & MESSAGES
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_for_user', 'resolved', 'closed')),
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_type TEXT NOT NULL DEFAULT 'admin' CHECK (sender_type IN ('admin', 'user', 'system')),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_ticket_messages(ticket_id, created_at ASC);

-- 5. FEATURE FLAGS
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rollout_percentage INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    environment TEXT NOT NULL DEFAULT 'all' CHECK (environment IN ('all', 'development', 'staging', 'production')),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed Initial Feature Flags
INSERT INTO public.feature_flags (key, name, description, is_enabled, rollout_percentage, environment)
VALUES
    ('realtime_group_chat', 'Nhắn tin nhóm thời gian thực', 'Cho phép người dùng tạo nhóm và nhắn tin tức thì', TRUE, 100, 'all'),
    ('widget_custom_themes', 'Giao diện Widget nâng cao', 'Cung cấp các màu viền và kiểu dáng widget mới', TRUE, 100, 'all'),
    ('locket_sound_effects', 'Âm thanh chụp ảnh & phản ứng', 'Hiệu ứng âm thanh chân thực phong cách Locket', TRUE, 100, 'all'),
    ('ai_caption_assistant', 'Gợi ý chú thích ảnh AI', 'Tự động tạo câu chúc hoặc caption vui tươi theo ảnh', FALSE, 10, 'development')
ON CONFLICT (key) DO NOTHING;

-- 6. APP RELEASES
CREATE TABLE IF NOT EXISTS public.app_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web', 'all')),
    environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),
    status TEXT NOT NULL DEFAULT 'released' CHECK (status IN ('draft', 'rolling_out', 'released', 'deprecated')),
    release_notes TEXT,
    min_supported_version TEXT,
    download_url TEXT,
    released_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed Initial Releases
INSERT INTO public.app_releases (version, platform, environment, status, release_notes, min_supported_version)
VALUES
    ('1.0.0', 'ios', 'production', 'released', 'Ra mắt chính thức Snaply với Live Widget và Realtime Feed', '1.0.0'),
    ('1.0.0', 'android', 'production', 'released', 'Ra mắt chính thức Snaply trên Google Play Store', '1.0.0'),
    ('1.0.0', 'web', 'production', 'released', 'Phiên bản Web responsive & Landing Page trên Vercel', '1.0.0')
ON CONFLICT DO NOTHING;

-- 7. SECURITY FUNCTIONS (SECURITY DEFINER)
-- Checks if currently authenticated user has any active admin role
CREATE OR REPLACE FUNCTION public.is_admin(user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE user_id = user_id_param AND is_active = TRUE
    );
$$;

-- Gets the active role string of an admin user
CREATE OR REPLACE FUNCTION public.get_admin_role(user_id_param UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.admin_roles
    WHERE user_id = user_id_param AND is_active = TRUE
    LIMIT 1;
$$;

-- 8. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

-- (A) admin_roles RLS
DROP POLICY IF EXISTS "Admins can view admin roles" ON public.admin_roles;
CREATE POLICY "Admins can view admin roles"
    ON public.admin_roles FOR SELECT
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage admin roles" ON public.admin_roles;
CREATE POLICY "Super admins can manage admin roles"
    ON public.admin_roles FOR ALL
    USING (public.get_admin_role(auth.uid()) = 'super_admin')
    WITH CHECK (public.get_admin_role(auth.uid()) = 'super_admin');

-- (B) admin_audit_logs RLS
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.admin_audit_logs FOR SELECT
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
    ON public.admin_audit_logs FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

-- (C) support_tickets RLS
DROP POLICY IF EXISTS "Admins can view all support tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all support tickets"
    ON public.support_tickets FOR SELECT
    USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;
CREATE POLICY "Admins can update support tickets"
    ON public.support_tickets FOR UPDATE
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users and Admins can create tickets" ON public.support_tickets;
CREATE POLICY "Users and Admins can create tickets"
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- (D) feature_flags & app_releases RLS
DROP POLICY IF EXISTS "Anyone can view feature flags" ON public.feature_flags;
CREATE POLICY "Anyone can view feature flags"
    ON public.feature_flags FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;
CREATE POLICY "Admins can manage feature flags"
    ON public.feature_flags FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view app releases" ON public.app_releases;
CREATE POLICY "Anyone can view app releases"
    ON public.app_releases FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage app releases" ON public.app_releases;
CREATE POLICY "Admins can manage app releases"
    ON public.app_releases FOR ALL
    USING (public.get_admin_role(auth.uid()) IN ('super_admin', 'operations_admin'))
    WITH CHECK (public.get_admin_role(auth.uid()) IN ('super_admin', 'operations_admin'));
