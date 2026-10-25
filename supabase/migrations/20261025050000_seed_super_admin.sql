-- Cấp quyền Super Admin cho tài khoản nguyencongnguyen.media@gmail.com
INSERT INTO public.admin_roles (user_id, role, is_active)
SELECT id, 'super_admin', TRUE
FROM auth.users
WHERE email = 'nguyencongnguyen.media@gmail.com'
ON CONFLICT (user_id) DO UPDATE 
SET role = 'super_admin', is_active = TRUE, updated_at = NOW();

-- Đảm bảo profile người dùng cũng ở trạng thái active
UPDATE public.profiles
SET status = 'active'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'nguyencongnguyen.media@gmail.com'
);
