-- Create table for leave requests
create table if not exists public.leave_requests (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    leave_date date not null,
    reason text,
    image_url text,
    status text default 'pending', -- 'pending', 'approved', 'rejected'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.leave_requests enable row level security;

-- Policies
create policy "Users can view own leave requests"
on leave_requests for select
using ( auth.uid() = user_id );

create policy "Users can insert own leave requests"
on leave_requests for insert
with check ( auth.uid() = user_id );

create policy "Users can update own leave requests"
on leave_requests for update
using ( auth.uid() = user_id );
