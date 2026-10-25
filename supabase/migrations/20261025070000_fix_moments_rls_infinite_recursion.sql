-- Migration: 20261025070000_fix_moments_rls_infinite_recursion.sql
-- Description: Break infinite RLS recursion between moments and moment_recipients

-- 1. Create a SECURITY DEFINER helper function to check moment ownership without triggering moments RLS
CREATE OR REPLACE FUNCTION public.is_moment_owner(moment_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.moments
        WHERE id = moment_id_param AND owner_id = user_id_param
    );
$$;

-- 2. Create a SECURITY DEFINER helper to check if user is recipient without triggering moment_recipients RLS
CREATE OR REPLACE FUNCTION public.is_moment_recipient(moment_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.moment_recipients
        WHERE moment_id = moment_id_param AND recipient_id = user_id_param
    );
$$;

-- 3. Replace moment_recipients policies using SECURITY DEFINER functions
DROP POLICY IF EXISTS "View moment recipients" ON public.moment_recipients;
CREATE POLICY "View moment recipients"
ON public.moment_recipients FOR SELECT TO authenticated
USING (
    recipient_id = auth.uid()
    OR public.is_moment_owner(moment_id, auth.uid())
);

DROP POLICY IF EXISTS "Insert recipients for own moments" ON public.moment_recipients;
CREATE POLICY "Insert recipients for own moments"
ON public.moment_recipients FOR INSERT TO authenticated
WITH CHECK (
    public.is_moment_owner(moment_id, auth.uid())
);

-- 4. Replace moments SELECT policy using helper function
DROP POLICY IF EXISTS "Moments viewable by authorized circle" ON public.moments;
CREATE POLICY "Moments viewable by authorized circle"
ON public.moments FOR SELECT TO authenticated
USING (
    auth.uid() = owner_id
    OR public.is_moment_recipient(id, auth.uid())
    OR (
        group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = moments.group_id
            AND group_members.user_id = auth.uid()
        )
    )
    OR (
        group_id IS NULL AND EXISTS (
            SELECT 1 FROM public.friendships
            WHERE (friendships.user_id = moments.owner_id AND friendships.friend_id = auth.uid())
               OR (friendships.friend_id = moments.owner_id AND friendships.user_id = auth.uid())
        )
    )
);
