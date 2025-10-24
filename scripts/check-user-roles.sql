-- Check user roles in the database

SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.auth_user_id,
  u.created_at
FROM public."User" u
ORDER BY u.created_at DESC;

-- Also check if there are any auth users without User table entries
SELECT 'Auth users:' as info;
-- Note: This query won't work in SQL editor, but shows the concept
-- You'd need to check in Supabase Auth dashboard

