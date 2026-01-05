-- =====================================================
-- ORBIT SECURE CHAT - COMPLETE DATABASE RESET
-- Run this ONE query to reset everything
-- =====================================================
-- This drops ALL tables, recreates them, sets up RLS,
-- creates indexes, and is ready to use
-- =====================================================
-- IMPORTANT: If you're re-running this after a previous run,
-- make sure to check for any orphaned triggers in Supabase:
-- Run this query first to see existing triggers on auth.users:
--   SELECT * FROM information_schema.triggers WHERE event_object_schema = 'auth' AND event_object_table = 'users';
-- Then manually drop any you see that aren't handled by this script.
-- =====================================================

BEGIN;

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1. DROP ALL EXISTING TABLES & ENUMS
-- =====================================================

DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_participants CASCADE;
DROP TABLE IF EXISTS public.chat_keys CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.message_requests CASCADE;
DROP TABLE IF EXISTS public.public_users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.connection_logs CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- =====================================================
-- 1.5. DROP ALL TRIGGERS ON auth.users
-- =====================================================
-- Drop any existing triggers that might interfere with signup
-- Note: PostgreSQL requires knowing trigger names; drop common ones
DROP TRIGGER IF EXISTS trigger_create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

DROP FUNCTION IF EXISTS public.create_chat_with_participants(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_chat_participant(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_profiles_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_public_users_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_to_public_users() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_update_to_public_users() CASCADE;

-- Drop trigger function with any possible signature variations
DROP FUNCTION IF EXISTS public.create_profile_on_signup() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;

DROP TYPE IF EXISTS public.request_status CASCADE;
DROP TYPE IF EXISTS public.account_visibility CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- =====================================================
-- 2. CREATE ENUMS
-- =====================================================

CREATE TYPE public.account_visibility AS ENUM ('public', 'private');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'rejected');

-- =====================================================
-- 3. CREATE PROFILES TABLE
-- =====================================================
-- Stores user profile info, linked to auth.users by id

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  visibility public.account_visibility DEFAULT 'public',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. CREATE PUBLIC_USERS TABLE
-- =====================================================
-- Read-only public directory (anyone can view)
-- Synced from profiles table

CREATE TABLE public.public_users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  visibility public.account_visibility DEFAULT 'public',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. CREATE CHATS TABLE
-- =====================================================
-- Stores chat sessions between users

CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 6. CREATE CHAT_PARTICIPANTS TABLE
-- =====================================================
-- Tracks who is in each chat

CREATE TABLE public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- =====================================================
-- 7. CREATE CHAT_KEYS TABLE
-- =====================================================
-- Stores encrypted symmetric keys for each chat
-- Each participant gets the key encrypted with their public key

CREATE TABLE public.chat_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL,
  key_version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 8. CREATE MESSAGES TABLE
-- =====================================================
-- Stores encrypted chat messages
-- encrypted_content is encrypted with the chat's symmetric key
-- nonce is for encryption
-- is_system marks system-generated messages (like request acceptance)

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,
  nonce TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 9. CREATE MESSAGE_REQUESTS TABLE
-- =====================================================
-- Stores friend/contact requests between users

CREATE TABLE public.message_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status public.request_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

-- =====================================================
-- 10. CREATE USER_ROLES TABLE
-- =====================================================
-- Stores user roles (admin, user, etc)

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role public.app_role DEFAULT 'user'
);

-- =====================================================
-- 11. CREATE CONNECTION_LOGS TABLE
-- =====================================================
-- Tracks user connections/events for debugging

CREATE TABLE public.connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 12. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_username_lower ON public.profiles (LOWER(username));
CREATE INDEX idx_profiles_display_name_lower ON public.profiles (LOWER(display_name));
CREATE INDEX idx_profiles_created_at ON public.profiles (created_at DESC);
CREATE INDEX idx_profiles_is_online ON public.profiles (is_online);
CREATE INDEX idx_profiles_visibility ON public.profiles (visibility);

-- Public users indexes
CREATE INDEX idx_public_users_username_lower ON public.public_users (LOWER(username));
CREATE INDEX idx_public_users_display_name_lower ON public.public_users (LOWER(display_name));
CREATE INDEX idx_public_users_created_at ON public.public_users (created_at DESC);
CREATE INDEX idx_public_users_is_online ON public.public_users (is_online);
CREATE INDEX idx_public_users_visibility ON public.public_users (visibility);

-- Chat indexes
CREATE INDEX idx_chat_participants_user_id ON public.chat_participants (user_id);
CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants (chat_id);
CREATE INDEX idx_messages_chat_id ON public.messages (chat_id);
CREATE INDEX idx_messages_sender_id ON public.messages (sender_id);
CREATE INDEX idx_messages_created_at ON public.messages (created_at DESC);

-- Request indexes
CREATE INDEX idx_message_requests_from_user ON public.message_requests (from_user_id);
CREATE INDEX idx_message_requests_to_user ON public.message_requests (to_user_id);
CREATE INDEX idx_message_requests_status ON public.message_requests (status);

-- Connection logs
CREATE INDEX idx_connection_logs_user_id ON public.connection_logs (user_id);
CREATE INDEX idx_connection_logs_created_at ON public.connection_logs (created_at);

-- =====================================================
-- 12.5. CREATE FUNCTIONS (REQUIRED BY RLS)
-- =====================================================

-- Function: Check if user is chat participant (used by RLS policies)
CREATE FUNCTION public.is_chat_participant(chat_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.chat_id = $1 AND chat_participants.user_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- =====================================================
-- 13. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 14. RLS POLICIES - PROFILES
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Users can read profiles of users they're chatting with
CREATE POLICY "Users can read chat participant profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp1
    JOIN public.chat_participants cp2 ON cp1.chat_id = cp2.chat_id
    WHERE cp1.user_id = auth.uid() AND cp2.user_id = profiles.id
  )
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 15. RLS POLICIES - PUBLIC_USERS
-- =====================================================

-- Anyone can read public_users (no auth needed)
CREATE POLICY "Public read access" ON public.public_users
FOR SELECT USING (true);

-- No one can insert directly (synced from profiles)
CREATE POLICY "No direct inserts" ON public.public_users
FOR INSERT WITH CHECK (false);

-- No one can update directly (synced from profiles)
CREATE POLICY "No direct updates" ON public.public_users
FOR UPDATE USING (false);

-- No one can delete directly (synced from profiles)
CREATE POLICY "No direct deletes" ON public.public_users
FOR DELETE USING (false);

-- =====================================================
-- 16. RLS POLICIES - CHATS
-- =====================================================

-- Users can only see chats they're in
CREATE POLICY "Users can read their chats" ON public.chats
FOR SELECT USING (public.is_chat_participant(chats.id, auth.uid()));

-- Users can create chats
CREATE POLICY "Users can create chats" ON public.chats
FOR INSERT WITH CHECK (true);

-- Users can update their chats
CREATE POLICY "Users can update their chats" ON public.chats
FOR UPDATE USING (public.is_chat_participant(chats.id, auth.uid()));

-- =====================================================
-- 17. RLS POLICIES - CHAT_PARTICIPANTS
-- =====================================================

-- Users can read participants of chats they're in
CREATE POLICY "Users can read chat participants" ON public.chat_participants
FOR SELECT USING (public.is_chat_participant(chat_participants.chat_id, auth.uid()));

-- Users can add themselves to chats
CREATE POLICY "Users can join chats" ON public.chat_participants
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 18. RLS POLICIES - CHAT_KEYS
-- =====================================================

-- Users can read keys for chats they're in
CREATE POLICY "Users can read chat keys" ON public.chat_keys
FOR SELECT USING (public.is_chat_participant(chat_keys.chat_id, auth.uid()));

-- Users can create keys
CREATE POLICY "Users can create chat keys" ON public.chat_keys
FOR INSERT WITH CHECK (auth.uid() = created_by);

-- =====================================================
-- 19. RLS POLICIES - MESSAGES
-- =====================================================

-- Users can read messages in chats they're in
CREATE POLICY "Users can read messages" ON public.messages
FOR SELECT USING (public.is_chat_participant(messages.chat_id, auth.uid()));

-- Users can insert messages in chats they're in
CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND public.is_chat_participant(messages.chat_id, auth.uid())
);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON public.messages
FOR DELETE USING (auth.uid() = sender_id);

-- Enable realtime replication for messages (required for subscriptions)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =====================================================
-- 20. RLS POLICIES - MESSAGE_REQUESTS
-- =====================================================

-- Users can read requests sent to them
CREATE POLICY "Users can read incoming requests" ON public.message_requests
FOR SELECT USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

-- Users can create requests
CREATE POLICY "Users can send requests" ON public.message_requests
FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Users can update requests sent to them (to accept)
CREATE POLICY "Users can update incoming requests" ON public.message_requests
FOR UPDATE USING (to_user_id = auth.uid());

-- Users can delete requests they received (to reject)
CREATE POLICY "Users can delete incoming requests" ON public.message_requests
FOR DELETE USING (to_user_id = auth.uid());

-- =====================================================
-- 21. RLS POLICIES - USER_ROLES
-- =====================================================

-- Users can read their own role
CREATE POLICY "Users can read their role" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- Admins can read all roles
CREATE POLICY "Admins can read all roles" ON public.user_roles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- =====================================================
-- 22. RLS POLICIES - CONNECTION_LOGS
-- =====================================================

-- Users can read their own logs
CREATE POLICY "Users can read own logs" ON public.connection_logs
FOR SELECT USING (user_id = auth.uid());

-- Authenticated users can insert logs
CREATE POLICY "Authenticated users can log" ON public.connection_logs
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 23. CREATE FUNCTIONS
-- =====================================================

-- Function: Create chat with participants
CREATE FUNCTION public.create_chat_with_participants(target_user_id UUID)
RETURNS UUID AS $$
DECLARE
  chat_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.chats (created_at, updated_at)
  VALUES (now(), now())
  RETURNING id INTO chat_id;

  INSERT INTO public.chat_participants (chat_id, user_id)
  VALUES (chat_id, auth.uid()), (chat_id, target_user_id);

  RETURN chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Check if user has role
CREATE FUNCTION public.has_role(user_id UUID, role public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1 AND user_roles.role = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Function: Auto-update profiles.updated_at
CREATE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-update public_users.updated_at
CREATE FUNCTION public.update_public_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Sync profiles to public_users on insert
CREATE FUNCTION public.sync_profile_to_public_users()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.public_users (
    id, username, display_name, email, avatar_url, bio, visibility, is_online, last_seen
  ) VALUES (
    NEW.id, NEW.username, NEW.display_name, NEW.email, NEW.avatar_url,
    NEW.bio, NEW.visibility, NEW.is_online, NEW.last_seen
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio,
    visibility = EXCLUDED.visibility,
    is_online = EXCLUDED.is_online,
    last_seen = EXCLUDED.last_seen,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Sync profiles to public_users on update
CREATE FUNCTION public.sync_profile_update_to_public_users()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.public_users SET
    display_name = NEW.display_name,
    email = NEW.email,
    avatar_url = NEW.avatar_url,
    bio = NEW.bio,
    visibility = NEW.visibility,
    is_online = NEW.is_online,
    last_seen = NEW.last_seen,
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 24. CREATE TRIGGERS
-- =====================================================

-- Auto-update profiles.updated_at on profile change
CREATE TRIGGER trigger_update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_profiles_updated_at();

-- Auto-update public_users.updated_at on update
CREATE TRIGGER trigger_update_public_users_updated_at
BEFORE UPDATE ON public.public_users
FOR EACH ROW
EXECUTE FUNCTION public.update_public_users_updated_at();

-- Sync profile insert to public_users
CREATE TRIGGER trigger_sync_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_to_public_users();

-- Sync profile update to public_users
CREATE TRIGGER trigger_sync_profile_update
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_update_to_public_users();

-- Function: Auto-create profile on user signup
CREATE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_username_base TEXT;
  v_username_try TEXT;
  v_display_name TEXT;
  v_visibility TEXT;
  v_visibility_enum public.account_visibility;
  v_attempt INT;
  v_inserted BOOLEAN := false;
BEGIN
  -- Base username from metadata; sanitize to avoid weird characters
  v_username_base := COALESCE(NEW.raw_user_meta_data->>'username', '');
  v_username_base := lower(regexp_replace(v_username_base, '[^a-z0-9_]', '_', 'g'));
  IF v_username_base = '' THEN
    v_username_base := SUBSTRING(NEW.id::text, 1, 8);
  END IF;
  
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    v_username_base
  );
  
  v_visibility := COALESCE(
    NEW.raw_user_meta_data->>'visibility',
    'public'
  );

  -- Never allow a bad visibility value to crash signup
  v_visibility_enum := CASE
    WHEN lower(v_visibility) = 'private' THEN 'private'::public.account_visibility
    ELSE 'public'::public.account_visibility
  END;

  -- Create profile; if username conflicts, generate a unique one instead of failing signup
  BEGIN
    v_username_try := v_username_base;
    FOR v_attempt IN 1..5 LOOP
      BEGIN
        INSERT INTO public.profiles (
          id, username, display_name, email, visibility
        ) VALUES (
          NEW.id,
          v_username_try,
          v_display_name,
          NEW.email,
          v_visibility_enum
        );
        v_inserted := true;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        v_username_try := left(v_username_base, 15) || '_' || substr(gen_random_uuid()::text, 1, 4);
      END;
    END LOOP;
  EXCEPTION WHEN others THEN
    -- IMPORTANT: Never break auth signup.
    -- Any unexpected error here must NOT abort the auth.users insert.
    RETURN NEW;
  END;

  -- IMPORTANT: Never break auth signup.
  -- If profile couldn't be created for any reason (constraints, RLS, etc),
  -- let signup succeed; the app can create/fix the profile post-login.
  IF v_inserted THEN
    -- Create default user role (ignore if it already exists)
    BEGIN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'user');
    EXCEPTION WHEN unique_violation THEN
      NULL;
    WHEN others THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Trigger: Create profile when user signs up
CREATE TRIGGER trigger_create_profile_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_on_signup();

-- =====================================================
-- 25. INSERT TEST DATA
-- =====================================================

-- Test users (you need real auth.users from Supabase auth)
-- Uncomment and modify with real UUIDs from your Supabase auth

/*
-- User 1: Alice
INSERT INTO public.profiles (
  id, username, display_name, email, avatar_url, bio, visibility, is_online
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'alice',
  'Alice Wonder',
  'alice@example.com',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
  'Love exploring new things!',
  'public',
  true
);

INSERT INTO public.user_roles (user_id, role)
VALUES ('550e8400-e29b-41d4-a716-446655440001', 'user');

-- User 2: Bob
INSERT INTO public.profiles (
  id, username, display_name, email, avatar_url, bio, visibility, is_online
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'bob',
  'Bob Builder',
  'bob@example.com',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
  'Building amazing apps',
  'public',
  false
);

INSERT INTO public.user_roles (user_id, role)
VALUES ('550e8400-e29b-41d4-a716-446655440002', 'user');

-- User 3: Charlie
INSERT INTO public.profiles (
  id, username, display_name, email, avatar_url, bio, visibility, is_online
) VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  'charlie',
  'Charlie Chat',
  'charlie@example.com',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
  'Chat enthusiast',
  'public',
  true
);

INSERT INTO public.user_roles (user_id, role)
VALUES ('550e8400-e29b-41d4-a716-446655440003', 'user');

-- User 4: Diana
INSERT INTO public.profiles (
  id, username, display_name, email, avatar_url, bio, visibility, is_online
) VALUES (
  '550e8400-e29b-41d4-a716-446655440004',
  'diana',
  'Diana Dev',
  'diana@example.com',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=diana',
  'Developer and designer',
  'public',
  false
);

INSERT INTO public.user_roles (user_id, role)
VALUES ('550e8400-e29b-41d4-a716-446655440004', 'user');
*/

-- =====================================================
-- 26. VERIFICATION QUERIES
-- =====================================================

-- Run these to verify everything is set up
/*
SELECT 'Tables created' as check_result;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

SELECT 'Enums created' as check_result;
SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname;

SELECT 'RLS enabled on tables' as check_result;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

SELECT 'Indexes created' as check_result;
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;

SELECT 'Functions created' as check_result;
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' ORDER BY routine_name;

SELECT 'Triggers created' as check_result;
SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY trigger_name;

SELECT COUNT(*) as total_users FROM public.profiles;
SELECT COUNT(*) as total_chats FROM public.chats;
SELECT COUNT(*) as total_messages FROM public.messages;
SELECT COUNT(*) as total_requests FROM public.message_requests;
*/

COMMIT;

-- =====================================================
-- SUCCESS! DATABASE IS READY
-- =====================================================
-- All tables, policies, functions, and triggers are set up
-- Ready for use!
