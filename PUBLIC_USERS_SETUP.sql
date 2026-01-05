-- ============================================================================
-- ORBIT CHAT - PUBLIC USERS TABLE SETUP
-- ============================================================================
-- This creates a completely separate public users table that doesn't rely on
-- Supabase Authentication. Anyone can view profiles without logging in!
-- ============================================================================

-- Step 1: Create the public_users table
DROP TABLE IF EXISTS public.public_users CASCADE;

CREATE TABLE public.public_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT UNIQUE,
  
  -- Profile info
  avatar_url TEXT,
  bio TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  
  -- Status
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Enable RLS
ALTER TABLE public.public_users ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS Policies

-- Everyone can read (it's public!)
CREATE POLICY "anyone_can_read"
ON public.public_users FOR SELECT
USING (true);

-- Disable direct inserts (only app can create via admin)
CREATE POLICY "no_inserts"
ON public.public_users FOR INSERT
WITH CHECK (false);

-- Disable direct updates (only app can update via admin)
CREATE POLICY "no_updates"
ON public.public_users FOR UPDATE
WITH CHECK (false);

-- Disable deletes
CREATE POLICY "no_deletes"
ON public.public_users FOR DELETE
WITH CHECK (false);

-- Step 4: Create indexes for search
CREATE INDEX idx_public_users_username_lower 
ON public.public_users USING btree (LOWER(username));

CREATE INDEX idx_public_users_display_name_lower 
ON public.public_users USING btree (LOWER(display_name));

CREATE INDEX idx_public_users_created_at 
ON public.public_users(created_at DESC);

CREATE INDEX idx_public_users_is_online 
ON public.public_users(is_online);

-- Step 5: Create function to auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_public_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for timestamps
DROP TRIGGER IF EXISTS update_public_users_updated_at ON public.public_users;
CREATE TRIGGER update_public_users_updated_at
  BEFORE UPDATE ON public.public_users
  FOR EACH ROW EXECUTE FUNCTION public.update_public_users_timestamp();

-- Step 7: Grant permissions
GRANT SELECT ON public.public_users TO authenticated, anon;

-- Step 8: Insert test users
INSERT INTO public.public_users (username, display_name, email, avatar_url, bio, visibility, is_online)
VALUES 
  ('alice', 'Alice Wonder', 'alice@example.com', NULL, 'Love encrypted chat 🔐', 'public', true),
  ('bob', 'Bob Builder', 'bob@example.com', NULL, 'Building the future', 'public', true),
  ('charlie', 'Charlie Day', 'charlie@example.com', NULL, 'Always online', 'public', false),
  ('diana', 'Diana Prince', 'diana@example.com', NULL, 'Wonder woman fan', 'public', true)
ON CONFLICT (username) DO NOTHING;

-- Step 9: Verify
SELECT 
  COUNT(*) as total_users,
  SUM(CASE WHEN is_online THEN 1 ELSE 0 END) as online_count
FROM public.public_users;

SELECT * FROM public.public_users ORDER BY created_at DESC LIMIT 5;
