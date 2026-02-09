-- Create table for generic change requests (attendance edits, profile changes, etc.)
create table if not exists public.change_requests (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    type text not null, -- 'attendance_edit', 'profile_update', 'other'
    status text default 'pending', -- 'pending', 'approved', 'rejected'
    payload jsonb default '{}'::jsonb, -- JSON details of the change
    reason text,
    admin_note text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.change_requests enable row level security;

-- Policies
create policy "Users can view their own requests"
    on change_requests for select
    using (auth.uid() = user_id);

create policy "Users can insert their own requests"
    on change_requests for insert
    with check (auth.uid() = user_id);

create policy "Admins can view all requests"
    on change_requests for select
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and exists (
                select 1 from public.roles
                where roles.id = profiles.role_id
                and roles.name in ('admin', 'super_admin')
            )
        )
    );

create policy "Admins can update requests"
    on change_requests for update
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and exists (
                select 1 from public.roles
                where roles.id = profiles.role_id
                and roles.name in ('admin', 'super_admin')
            )
        )
    );
