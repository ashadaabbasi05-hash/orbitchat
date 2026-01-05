-- ============================================================================
-- ORBIT CHAT - PUBLIC USERS TABLE
-- ============================================================================
-- Create a public users table independent of auth
-- This allows anyone to view profiles without authentication
-- ============================================================================

-- Create the public_users table
CREATE TABLE IF NOT EXISTS public.public_users (
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

-- Enable RLS
ALTER TABLE public.public_users ENABLE ROW LEVEL SECURITY;

-- Everyone can read (it's public!)
CREATE POLICY "anyone_can_read_public_users"
ON public.public_users FOR SELECT
USING (true);

-- For now, disable writes/updates via RLS (you'll handle via app logic)
-- Only your backend can update via INSERT/UPDATE
CREATE POLICY "no_direct_insert"
ON public.public_users FOR INSERT
WITH CHECK (false);

CREATE POLICY "no_direct_update"
ON public.public_users FOR UPDATE
WITH CHECK (false);

CREATE POLICY "no_direct_delete"
ON public.public_users FOR DELETE
WITH CHECK (false);

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_public_users_username_lower 
ON public.public_users USING btree (LOWER(username));

CREATE INDEX IF NOT EXISTS idx_public_users_display_name_lower 
ON public.public_users USING btree (LOWER(display_name));

CREATE INDEX IF NOT EXISTS idx_public_users_created_at 
ON public.public_users(created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_public_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for timestamp updates
DROP TRIGGER IF EXISTS update_public_users_updated_at ON public.public_users;
CREATE TRIGGER update_public_users_updated_at
  BEFORE UPDATE ON public.public_users
  FOR EACH ROW EXECUTE FUNCTION public.update_public_users_timestamp();

-- Insert test users
INSERT INTO public.public_users (id, username, display_name, email, avatar_url, bio, visibility, is_online)
VALUES 
  (gen_random_uuid(), 'alice', 'Alice Wonder', 'alice@example.com', NULL, 'Love encrypted chat 🔐', 'public', true),
  (gen_random_uuid(), 'bob', 'Bob Builder', 'bob@example.com', NULL, 'Building the future', 'public', true),
  (gen_random_uuid(), 'charlie', 'Charlie Day', 'charlie@example.com', NULL, 'Always online', 'public', false),
  (gen_random_uuid(), 'diana', 'Diana Prince', 'diana@example.com', NULL, 'Wonder woman fan', 'public', true)
ON CONFLICT (username) DO NOTHING;

-- Verify
SELECT COUNT(*) as total_users FROM public.public_users;
SELECT * FROM public.public_users LIMIT 10;
