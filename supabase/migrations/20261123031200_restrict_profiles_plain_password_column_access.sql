-- Keep student login passwords for admin-only login-card printing.
-- Browser roles can read the public profile fields needed by the application,
-- but cannot select plain_password. Server-side service_role retains access.

REVOKE SELECT ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  full_name,
  role,
  created_at,
  username,
  class_code,
  xp,
  level,
  badges,
  avatar_url
) ON TABLE public.profiles TO anon, authenticated;

REVOKE SELECT (plain_password)
ON TABLE public.profiles
FROM PUBLIC, anon, authenticated;
