-- Migration: Fix FCM Token registration for multiple users on same device
-- Created: 2026-02-25

-- 1. Ensure token column has a unique constraint if it doesn't already 
-- (The error message fcm_tokens_token_key confirms it exists in the actual DB)
-- If it doesn't exist, this will fail gracefully or we can add it.
-- Based on the error report, it definitely exists.

-- 2. Create a secure RPC to handle token registration/handover
-- This function runs with SECURITY DEFINER to allow it to delete existing tokens 
-- that might belong to other users (handover scenario).
CREATE OR REPLACE FUNCTION public.register_fcm_token(p_token TEXT, p_device_type TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Step A: Remove this token from any other user it might be associated with
    -- This handles the case where multiple users use the same device/browser
    DELETE FROM public.fcm_tokens WHERE token = p_token;

    -- Step B: Insert the token for the current user
    INSERT INTO public.fcm_tokens (user_id, token, device_type, updated_at)
    VALUES (auth.uid(), p_token, p_device_type, NOW());
END;
$$;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.register_fcm_token(TEXT, TEXT) TO authenticated;
