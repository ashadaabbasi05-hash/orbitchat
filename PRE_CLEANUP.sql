-- =====================================================
-- PRE-CLEANUP SCRIPT
-- Run this FIRST before running COMPLETE_DB_RESET.sql
-- =====================================================
-- This script finds and drops ALL triggers and functions
-- that might interfere with a clean reset.
-- =====================================================

-- First, let's see what triggers exist on auth.users
-- (This is just informational, won't break anything)
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users';

-- Now drop ALL triggers from auth.users table
-- We'll use a dynamic approach to drop whatever exists
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  FOR trigger_rec IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_schema = 'auth' 
      AND event_object_table = 'users'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE', trigger_rec.trigger_name);
    RAISE NOTICE 'Dropped trigger: %', trigger_rec.trigger_name;
  END LOOP;
END $$;

-- Drop all functions in the public schema that might be trigger functions
DROP FUNCTION IF EXISTS public.create_profile_on_signup() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user() CASCADE;

-- Verify all triggers are gone
SELECT 
  trigger_name
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users';

-- If the above query returns any rows, those triggers couldn't be dropped
-- You'll need to manually investigate why
