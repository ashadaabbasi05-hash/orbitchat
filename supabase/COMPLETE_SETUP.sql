-- ============================================================================
-- ORBIT CHAT - COMPLETE MISSING SETUP
-- ============================================================================
-- This file contains everything needed to set up Orbit Chat from scratch
-- Run these queries in Supabase SQL Editor in order
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE ENUMS (if not already created)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_visibility') THEN
    CREATE TYPE public.account_visibility AS ENUM ('public', 'private');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'rejected');
  END IF;
END$$;

-- ============================================================================
-- STEP 2: CREATE TABLES
-- ============================================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  visibility account_visibility NOT NULL DEFAULT 'public',
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- Chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat participants table
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,
  nonce TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Message requests table
CREATE TABLE IF NOT EXISTS public.message_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

-- Connection logs table
CREATE TABLE IF NOT EXISTS public.connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat keys table
CREATE TABLE IF NOT EXISTS public.chat_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chat_id)
);

-- ============================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.message_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.connection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is chat participant
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id UUID, _chat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE user_id = _user_id
      AND chat_id = _chat_id
  )
$$;

-- Function to create chat with participants (THIS IS CRITICAL!)
CREATE OR REPLACE FUNCTION public.create_chat_with_participants(target_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_chat_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user ID is required';
  END IF;
  
  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot create chat with yourself';
  END IF;
  
  -- Create the chat
  INSERT INTO public.chats DEFAULT VALUES
  RETURNING id INTO new_chat_id;
  
  -- Add both participants
  INSERT INTO public.chat_participants (chat_id, user_id)
  VALUES 
    (new_chat_id, current_user_id),
    (new_chat_id, target_user_id);
  
  RETURN new_chat_id;
END;
$$;

-- Function to update timestamps (required for updated_at)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle profile creation on signup (THIS IS CRITICAL!)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, visibility)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'username')::text, split_part(new.email, '@', 1)),
    (new.raw_user_meta_data->>'display_name')::text,
    COALESCE((new.raw_user_meta_data->>'visibility')::account_visibility, 'public'::account_visibility)
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- STEP 5: CREATE TRIGGERS
-- ============================================================================

-- Trigger to create profile on new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on chats
DROP TRIGGER IF EXISTS update_chats_updated_at ON public.chats;
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on message_requests
DROP TRIGGER IF EXISTS update_message_requests_updated_at ON public.message_requests;
CREATE TRIGGER update_message_requests_updated_at
  BEFORE UPDATE ON public.message_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 6: DROP ALL OLD POLICIES
-- ============================================================================

-- This ensures we have a clean slate
DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.chats';
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.chat_participants';
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.messages';
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.message_requests';
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.user_roles';
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.connection_logs';
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.chat_keys';
  END LOOP;
END$$;

-- ============================================================================
-- STEP 7: CREATE NEW RLS POLICIES (CORRECT VERSION)
-- ============================================================================

-- PROFILES: Everyone can read, users can update their own
CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- CHATS: Only participants can read
CREATE POLICY "chats_select" ON public.chats
FOR SELECT USING (public.is_chat_participant(auth.uid(), id));

CREATE POLICY "chats_insert" ON public.chats
FOR INSERT WITH CHECK (true);

-- CHAT PARTICIPANTS: Only see participants of their chats
CREATE POLICY "chat_participants_select" ON public.chat_participants
FOR SELECT USING (public.is_chat_participant(auth.uid(), chat_id));

CREATE POLICY "chat_participants_insert" ON public.chat_participants
FOR INSERT WITH CHECK (true);

-- MESSAGES: Only participants can read their chat's messages
CREATE POLICY "messages_select" ON public.messages
FOR SELECT USING (public.is_chat_participant(auth.uid(), chat_id));

CREATE POLICY "messages_insert" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id 
  AND public.is_chat_participant(auth.uid(), chat_id)
);

-- MESSAGE REQUESTS: Users see requests they sent or received
CREATE POLICY "message_requests_select" ON public.message_requests
FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "message_requests_insert" ON public.message_requests
FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "message_requests_update" ON public.message_requests
FOR UPDATE USING (auth.uid() = to_user_id)
WITH CHECK (auth.uid() = to_user_id);

-- USER ROLES: Users see their own roles
CREATE POLICY "user_roles_select" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_roles_insert" ON public.user_roles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CONNECTION LOGS: Users can insert their own logs
CREATE POLICY "connection_logs_insert" ON public.connection_logs
FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- CHAT KEYS: Participants can read/write keys
CREATE POLICY "chat_keys_select" ON public.chat_keys
FOR SELECT USING (public.is_chat_participant(auth.uid(), chat_id));

CREATE POLICY "chat_keys_insert" ON public.chat_keys
FOR INSERT WITH CHECK (
  public.is_chat_participant(auth.uid(), chat_id)
  AND auth.uid() = created_by
);

CREATE POLICY "chat_keys_update" ON public.chat_keys
FOR UPDATE USING (public.is_chat_participant(auth.uid(), chat_id))
WITH CHECK (public.is_chat_participant(auth.uid(), chat_id));

-- ============================================================================
-- STEP 8: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username_lower 
ON public.profiles USING btree (LOWER(username));

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_lower 
ON public.profiles USING btree (LOWER(display_name));

CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id 
ON public.chat_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id 
ON public.chat_participants(chat_id);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id 
ON public.messages(chat_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
ON public.messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON public.messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_requests_from_user_id 
ON public.message_requests(from_user_id);

CREATE INDEX IF NOT EXISTS idx_message_requests_to_user_id 
ON public.message_requests(to_user_id);

CREATE INDEX IF NOT EXISTS idx_message_requests_status 
ON public.message_requests(status);

CREATE INDEX IF NOT EXISTS idx_chat_keys_chat_id 
ON public.chat_keys(chat_id);

CREATE INDEX IF NOT EXISTS idx_connection_logs_user_id 
ON public.connection_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_connection_logs_created_at 
ON public.connection_logs(created_at DESC);

-- ============================================================================
-- STEP 9: GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Allow authenticated users to access all tables
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chats TO authenticated;
GRANT SELECT, INSERT ON public.chat_participants TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.message_requests TO authenticated;
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT INSERT ON public.connection_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_keys TO authenticated;

-- Allow functions to be executed
GRANT EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_chat_with_participants(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- ============================================================================
-- STEP 10: VERIFICATION QUERIES
-- ============================================================================

-- Verify tables exist
SELECT 
  COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'chats', 'messages', 'chat_participants', 
                     'message_requests', 'chat_keys', 'connection_logs', 'user_roles');

-- Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'chats', 'messages', 'chat_participants', 
                    'message_requests', 'chat_keys', 'connection_logs', 'user_roles')
ORDER BY tablename;

-- Verify policies exist (should be 14 policies for profiles alone once done)
SELECT 
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public';

-- Show all policies by table
SELECT 
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- STEP 11: TROUBLESHOOTING
-- ============================================================================

-- If profile not loading, check if profile exists for current user:
-- SELECT * FROM profiles WHERE id = auth.uid();

-- If search not working, try this test query:
-- SELECT id, username, display_name FROM profiles 
-- WHERE LOWER(username) ILIKE '%test%' OR LOWER(display_name) ILIKE '%test%' LIMIT 10;

-- If you're getting permission denied errors, check if RLS is blocking:
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';
