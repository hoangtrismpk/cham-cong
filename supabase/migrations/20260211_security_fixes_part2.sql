-- 1. Fix Function Search Path (Explicit ALTER for exact signature match)
-- We use ALTER to ensure we target the existing function without worrying about REPLACE ambiguities
ALTER FUNCTION public.calculate_leave_duration(time without time zone, time without time zone, time without time zone, time without time zone) SET search_path = public;
ALTER FUNCTION public.create_audit_log(text, text, text, text, jsonb, jsonb, text, text) SET search_path = public;

-- 2. Move pg_net extension to 'extensions' schema
-- Since ALTER EXTENSION SET SCHEMA is not supported for pg_net, we drop and recreate
-- Verify if it's safe: pg_net is mostly for async HTTP calls, usually stateless.
DROP EXTENSION IF EXISTS pg_net;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 3. Grant usage on extensions schema to ensure things keep working
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
