-- FIX: Missing RLS Update Policy
-- This policy is required to allow users to "Check Out" (update their attendance log).

create policy "Users can update own attendance logs."
  on attendance_logs for update
  using ( auth.uid() = user_id );
