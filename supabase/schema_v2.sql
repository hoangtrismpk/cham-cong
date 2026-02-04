-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  first_name text,
  last_name text,
  full_name text,
  department text,
  avatar_url text,
  role text default 'employee', -- 'employee', 'admin', 'manager'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Policies for profiles
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create attendance_logs table
create table if not exists public.attendance_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  check_in_location point, -- Coordinates (lat, long)
  check_out_location point,
  check_in_note text,
  check_out_note text,
  work_date date default current_date not null,
  status text default 'present', -- 'present', 'late', 'absent'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on attendance_logs
alter table public.attendance_logs enable row level security;

-- Policies for attendance_logs
drop policy if exists "Users can view own attendance logs." on attendance_logs;
create policy "Users can view own attendance logs."
  on attendance_logs for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert own attendance logs." on attendance_logs;
create policy "Users can insert own attendance logs."
  on attendance_logs for insert
  with check ( auth.uid() = user_id );

-- Create settings table (for Admin)
create table if not exists public.settings (
  id uuid default uuid_generate_v4() primary key,
  setting_key text unique not null,
  setting_value jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Initial Settings (Upsert)
insert into public.settings (setting_key, setting_value)
values (
  'office_location',
  '{"latitude": 10.768615428290985, "longitude": 106.72630355374393, "radius": 200}'::jsonb
)
on conflict (setting_key) do nothing;

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, full_name, department, role)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'department',
    'employee'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid conflict
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
