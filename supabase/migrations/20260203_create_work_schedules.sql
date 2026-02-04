-- Create work_schedules table if not exists
create table if not exists public.work_schedules (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) not null,
    work_date date not null,
    shift_type text not null, -- 'full_day', 'morning', 'afternoon', 'custom'
    start_time text, -- '08:30'
    end_time text,   -- '18:00'
    location text,
    title text, -- Display title
    status text default 'active', -- 'active', 'pending'
    members_count int default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Ensure one schedule per day per user (Upsert constraint)
    unique(user_id, work_date)
);

-- Enable Row Level Security
alter table public.work_schedules enable row level security;

-- Policies
-- 1. Users can view their own schedules
create policy "Users can view own schedules"
on work_schedules for select
using ( auth.uid() = user_id );

-- 2. Users can insert/create their own schedules
create policy "Users can insert own schedules"
on work_schedules for insert
with check ( auth.uid() = user_id );

-- 3. Users can update their own schedules
create policy "Users can update own schedules"
on work_schedules for update
using ( auth.uid() = user_id );

-- 4. Users can delete their own schedules (optional, but good practice)
create policy "Users can delete own schedules"
on work_schedules for delete
using ( auth.uid() = user_id );
