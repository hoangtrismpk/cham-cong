-- 1. Enable RLS on vulnerable public tables
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_schedule_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wordpress_config ENABLE ROW LEVEL SECURITY;

-- 2. Add Policies for these tables
-- Settings: Admin can manage, Authenticated can read (if needed for app config)
CREATE POLICY "Admins can manage settings" ON public.settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'director'))
    );

CREATE POLICY "Authenticated can read settings" ON public.settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Company Schedule Config: Admin can manage, Authenticated can read
CREATE POLICY "Admins can manage schedule config" ON public.company_schedule_config
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'hr_manager', 'director'))
    );

CREATE POLICY "Authenticated can read schedule config" ON public.company_schedule_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- WordPress Config: Admin only
CREATE POLICY "Admins can manage wordpress config" ON public.wordpress_config
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'director'))
    );

-- 3. Fix Function Search Path (SECURITY DEFINER functions should set search_path)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.calculate_leave_duration(
    p_start_time time,
    p_end_time time,
    p_break_start time DEFAULT '12:00:00',
    p_break_end time DEFAULT '13:00:00'
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_duration numeric;
    v_break_duration numeric;
BEGIN
    IF p_start_time IS NULL OR p_end_time IS NULL THEN
        RETURN 0;
    END IF;

    -- Calculate total duration in hours
    v_duration := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600;

    -- Calculate break deduction if strict overlap logic is needed
    -- For simplicity here, just check if interval spans across break
    IF p_start_time < p_break_start AND p_end_time > p_break_end THEN
        v_break_duration := EXTRACT(EPOCH FROM (p_break_end - p_break_start)) / 3600;
        v_duration := v_duration - v_break_duration;
    END IF;

    RETURN GREATEST(ROUND(v_duration, 2), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_audit_log(
    p_action text,
    p_resource_type text,
    p_resource_id text,
    p_description text DEFAULT NULL,
    p_old_values jsonb DEFAULT NULL,
    p_new_values jsonb DEFAULT NULL,
    p_status text DEFAULT 'SUCCESS',
    p_error_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_user_email text;
    v_user_name text;
    v_user_role text;
    v_ip_address text;
    v_user_agent text;
    v_log_id uuid;
BEGIN
    -- Get current user context
    v_user_id := auth.uid();
    
    -- Fetch user details if logged in
    IF v_user_id IS NOT NULL THEN
        SELECT email, raw_user_meta_data->>'full_name' 
        INTO v_user_email, v_user_name
        FROM auth.users 
        WHERE id = v_user_id;
        
        SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
    ELSE
        v_user_name := 'System/Anonymous';
        v_user_role := 'system';
    END IF;

    -- Get request context (if available via headers/config - requires setup)
    -- For now, we leave them null or pass them if we could extend this function
    
    INSERT INTO public.audit_logs (
        user_id, user_email, user_name, user_role,
        action, resource_type, resource_id, description,
        old_values, new_values,
        status, error_message
    ) VALUES (
        v_user_id, v_user_email, v_user_name, v_user_role,
        p_action, p_resource_type, p_resource_id, p_description,
        p_old_values, p_new_values,
        p_status, p_error_message
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- Fix dangerous handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  RETURN new;
END;
$$;

-- Fix other reported mutable functions
ALTER FUNCTION public.check_user_permission(uuid, text) SET search_path = public;
ALTER FUNCTION public.handle_user_email_sync() SET search_path = public;
ALTER FUNCTION public.cleanup_old_audit_logs() SET search_path = public;
ALTER FUNCTION public.log_leave_approval() SET search_path = public;
ALTER FUNCTION public.check_if_admin() SET search_path = public;
ALTER FUNCTION public.update_wordpress_config_updated_at() SET search_path = public;


-- 5. Tighten "Always True" Policies
-- Instead of USING (true), explicitly check for service_role or admin
DROP POLICY IF EXISTS "Service role insert audit logs" ON public.audit_logs;
CREATE POLICY "System insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR 
        (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'hr_manager')))
    );

DROP POLICY IF EXISTS "System can insert/update work summaries" ON public.daily_work_summary;
CREATE POLICY "System manage work summaries" ON public.daily_work_summary
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'hr_manager'))
    );

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        -- Allow admins to create manual notifications manual
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'hr_manager'))
    );
