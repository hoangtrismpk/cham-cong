-- SYNC PROFILES SCRIPT
-- Run this to create missing profiles for existing users

insert into public.profiles (id, first_name, last_name, full_name, department, role)
select 
  id, 
  raw_user_meta_data->>'first_name',
  raw_user_meta_data->>'last_name',
  coalesce(raw_user_meta_data->>'full_name', email),
  raw_user_meta_data->>'department',
  'employee'
from auth.users
where id not in (select id from public.profiles);
