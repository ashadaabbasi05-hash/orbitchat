-- ============================================================================
-- ORBIT CHAT - COMPREHENSIVE RLS FIXES & COMPLETE SCHEMA
-- ============================================================================
-- Run this in your Supabase SQL editor to fix all RLS issues
-- 
-- This fixes:
-- 1. Profile not loading
-- 2. Search not working
-- 3. Missing RLS policies for service role
-- 4. Missing indexes for search performance
-- ============================================================================

-- ============================================================================
-- PART 1: DROP OLD BUGGY POLICIES (if they exist)
-- ============================================================================

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own default role" ON public.user_roles;

DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;
DROP POLICY IF EXISTS "Authenticated users can create chats" ON public.chats;

DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON public.chat_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.chat_participants;

DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their chats" ON public.messages;

DROP POLICY IF EXISTS "Users can view requests they sent or received" ON public.message_requests;
DROP POLICY IF EXISTS "Users can create message requests" ON public.message_requests;
DROP POLICY IF EXISTS "Recipients can update request status" ON public.message_requests;

DROP POLICY IF EXISTS "Users can insert their own logs" ON public.connection_logs;

DROP POLICY IF EXISTS "Chat participants can view chat keys" ON public.chat_keys;
DROP POLICY IF EXISTS "Chat participants can insert chat keys" ON public.chat_keys;
DROP POLICY IF EXISTS "Chat participants can update chat keys" ON public.chat_keys;

-- ============================================================================
-- PART 2: CREATE NEW RLS POLICIES WITH SERVICE ROLE BYPASS
-- ============================================================================

-- PROFILES TABLE POLICIES
-- Allow public read (for search, profile viewing)
CREATE POLICY "profiles_read_public"
ON public.profiles FOR SELECT
USING (true);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow service role to bypass RLS completely
CREATE POLICY "service_role_all"
ON public.profiles
FOR ALL
USING (current_setting('role') = 'authenticated' OR current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'authenticated' OR current_setting('role') = 'service_role');

-- USER ROLES TABLE POLICIES
CREATE POLICY "user_roles_read_own"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "user_roles_insert_own"
ON public.user_roles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_roles_service_role"
ON public.user_roles FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- CHATS TABLE POLICIES
CREATE POLICY "chats_read"
ON public.chats FOR SELECT
USING (public.is_chat_participant(auth.uid(), id));

CREATE POLICY "chats_create"
ON public.chats FOR INSERT
WITH CHECK (true);

CREATE POLICY "chats_service_role"
ON public.chats FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- CHAT PARTICIPANTS TABLE POLICIES
CREATE POLICY "chat_participants_read"
ON public.chat_participants FOR SELECT
USING (public.is_chat_participant(auth.uid(), chat_id));

CREATE POLICY "chat_participants_insert"
ON public.chat_participants FOR INSERT
WITH CHECK (true);

CREATE POLICY "chat_participants_service_role"
ON public.chat_participants FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- MESSAGES TABLE POLICIES
CREATE POLICY "messages_read"
ON public.messages FOR SELECT
USING (public.is_chat_participant(auth.uid(), chat_id));

CREATE POLICY "messages_insert"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND public.is_chat_participant(auth.uid(), chat_id)
);

CREATE POLICY "messages_service_role"
ON public.messages FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- MESSAGE REQUESTS TABLE POLICIES
CREATE POLICY "message_requests_read"
ON public.message_requests FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "message_requests_insert"
ON public.message_requests FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "message_requests_update"
ON public.message_requests FOR UPDATE
USING (auth.uid() = to_user_id);

CREATE POLICY "message_requests_service_role"
ON public.message_requests FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- CONNECTION LOGS TABLE POLICIES
CREATE POLICY "connection_logs_insert"
ON public.connection_logs FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "connection_logs_service_role"
ON public.connection_logs FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- CHAT KEYS TABLE POLICIES
CREATE POLICY "chat_keys_read"
ON public.chat_keys FOR SELECT
USING (public.is_chat_participant(auth.uid(), chat_id));

CREATE POLICY "chat_keys_insert"
ON public.chat_keys FOR INSERT
WITH CHECK (public.is_chat_participant(auth.uid(), chat_id) AND auth.uid() = created_by);

CREATE POLICY "chat_keys_update"
ON public.chat_keys FOR UPDATE
USING (public.is_chat_participant(auth.uid(), chat_id));

CREATE POLICY "chat_keys_service_role"
ON public.chat_keys FOR ALL
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- ============================================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Username search index (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower 
ON public.profiles USING btree (LOWER(username));

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_lower 
ON public.profiles USING btree (LOWER(display_name));

-- Chat participant lookups
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id 
ON public.chat_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id 
ON public.chat_participants(chat_id);

-- Message lookups
CREATE INDEX IF NOT EXISTS idx_messages_chat_id 
ON public.messages(chat_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
ON public.messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON public.messages(created_at DESC);

-- Message request lookups
CREATE INDEX IF NOT EXISTS idx_message_requests_from_user_id 
ON public.message_requests(from_user_id);

CREATE INDEX IF NOT EXISTS idx_message_requests_to_user_id 
ON public.message_requests(to_user_id);

CREATE INDEX IF NOT EXISTS idx_message_requests_status 
ON public.message_requests(status);

-- Chat keys lookups
CREATE INDEX IF NOT EXISTS idx_chat_keys_chat_id 
ON public.chat_keys(chat_id);

-- Connection logs
CREATE INDEX IF NOT EXISTS idx_connection_logs_user_id 
ON public.connection_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_connection_logs_created_at 
ON public.connection_logs(created_at DESC);

-- ============================================================================
-- PART 4: GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant SELECT on all tables to authenticated users
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.chats TO authenticated;
GRANT SELECT ON public.chat_participants TO authenticated;
GRANT SELECT ON public.messages TO authenticated;
GRANT SELECT ON public.message_requests TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Grant INSERT/UPDATE on tables
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.chats TO authenticated;
GRANT INSERT ON public.chat_participants TO authenticated;
GRANT INSERT ON public.messages TO authenticated;
GRANT INSERT, UPDATE ON public.message_requests TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_chat_with_participants(uuid) TO authenticated;

-- ============================================================================
-- PART 5: VERIFY SCHEMA
-- ============================================================================

-- Check all tables exist and RLS is enabled
SELECT 
  table_name,
  (SELECT count(*) FROM information_schema.table_constraints WHERE table_name = tables.table_name AND constraint_type = 'PRIMARY KEY') as has_pk
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'chats', 'messages', 'chat_participants', 'message_requests', 'chat_keys', 'connection_logs', 'user_roles')
ORDER BY table_name;

-- Check RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'chats', 'messages', 'chat_participants', 'message_requests', 'chat_keys', 'connection_logs', 'user_roles')
ORDER BY tablename;

-- Check policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- PART 6: TEST QUERIES (Run these to verify everything works)
-- ============================================================================

-- Test 1: Profile visibility (run as authenticated user)
-- SELECT * FROM profiles LIMIT 5;

-- Test 2: Search by username (run as authenticated user)
-- SELECT id, username, display_name, visibility FROM profiles 
-- WHERE LOWER(username) ILIKE '%test%' OR LOWER(display_name) ILIKE '%test%'
-- LIMIT 10;

-- Test 3: Check chat participants (run as authenticated user)
-- SELECT cp.chat_id, cp.user_id, p.username FROM chat_participants cp
-- JOIN profiles p ON p.id = cp.user_id
-- WHERE cp.chat_id = 'some-chat-id';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- If you're still having issues:
--
-- 1. Profile Not Loading:
--    - Check your .env has correct VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
--    - Verify user is authenticated before accessing profile
--    - Check browser console for SQL errors
--
-- 2. Search Not Working:
--    - Ensure LOWER() function works in your Supabase version
--    - Check the query uses ilike (case-insensitive like)
--    - Verify profiles table has data
--
-- 3. Service Role Not Working:
--    - Check backend .env has SUPABASE_SERVICE_KEY set
--    - Use service role key from Supabase Dashboard > Settings > API
--    - Ensure it has service_role permission
--
-- 4. Data Not Showing:
--    - Run: SELECT * FROM profiles; in SQL editor (should work)
--    - Check if RLS policies are too restrictive
--    - Verify user has chat_participants record for the chat
--
-- ============================================================================
