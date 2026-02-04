create table if not exists public.fcm_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  token text not null,
  device_type text, -- 'android', 'ios', 'web'
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, token) -- Một user có thể có nhiều thiết bị, nhưng không trùng token
);

-- Bật RLS
alter table public.fcm_tokens enable row level security;

-- Policy đơn giản: User xem/thêm/sửa token của chính mình
create policy "Users can manage their own fcm tokens"
on public.fcm_tokens for all
using (auth.uid() = user_id);
