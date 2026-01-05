-- =====================================================
-- SAFE MIGRATION - ADDS NEW FEATURES WITHOUT DROPPING DATA
-- =====================================================
-- This script only ADDS missing columns and policies
-- It will NOT delete any existing data
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ADD is_system COLUMN TO messages TABLE
-- =====================================================
-- This allows system messages (like request acceptance notifications)

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'is_system'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN is_system BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added is_system column to messages table';
    ELSE
        RAISE NOTICE '⏭️ is_system column already exists, skipping';
    END IF;
END $$;

-- =====================================================
-- 2. ADD DELETE RLS POLICY FOR MESSAGE_REQUESTS
-- =====================================================
-- Allows users to delete requests they received

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'message_requests' 
        AND policyname = 'Users can delete incoming requests'
    ) THEN
        CREATE POLICY "Users can delete incoming requests" ON public.message_requests
        FOR DELETE USING (to_user_id = auth.uid());
        RAISE NOTICE '✅ Added DELETE policy for message_requests';
    ELSE
        RAISE NOTICE '⏭️ DELETE policy already exists, skipping';
    END IF;
END $$;

-- =====================================================
-- 3. ADD CHAT INSERT/JOIN POLICIES (fix RLS errors when accepting)
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'chats'
          AND policyname = 'Users can create chats'
    ) THEN
        CREATE POLICY "Users can create chats" ON public.chats
        FOR INSERT WITH CHECK (true);
        RAISE NOTICE '✅ Added policy: Users can create chats';
    ELSE
        RAISE NOTICE '⏭️ Chat insert policy already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'chat_participants'
          AND policyname = 'Users can join chats'
    ) THEN
        CREATE POLICY "Users can join chats" ON public.chat_participants
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE '✅ Added policy: Users can join chats';
    ELSE
        RAISE NOTICE '⏭️ Chat participants insert policy already exists, skipping';
    END IF;
END $$;

-- =====================================================
-- 4. CREATE RPC create_chat_with_participants (security definer)
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'create_chat_with_participants' 
          AND pg_catalog.pg_function_is_visible(oid)
    ) THEN
        CREATE OR REPLACE FUNCTION public.create_chat_with_participants(target_user_id UUID)
        RETURNS UUID
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $f$
        DECLARE
            new_chat_id UUID;
            current_user_id UUID := auth.uid();
        BEGIN
            -- Basic guard
            IF current_user_id IS NULL THEN
                RAISE EXCEPTION 'Not authenticated';
            END IF;

            -- Create chat
            INSERT INTO public.chats DEFAULT VALUES RETURNING id INTO new_chat_id;

            -- Add participants (current user and target)
            INSERT INTO public.chat_participants (chat_id, user_id)
            VALUES
                (new_chat_id, current_user_id),
                (new_chat_id, target_user_id);

            RETURN new_chat_id;
        END;
        $f$;
        RAISE NOTICE '✅ Created function create_chat_with_participants';
    ELSE
        RAISE NOTICE '⏭️ Function create_chat_with_participants already exists, skipping';
    END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.create_chat_with_participants(UUID) TO authenticated;

-- =====================================================
-- 3. VERIFY CHANGES
-- =====================================================

DO $$
DECLARE
    has_is_system BOOLEAN;
    has_delete_policy BOOLEAN;
    has_chat_insert BOOLEAN;
    has_participant_insert BOOLEAN;
BEGIN
    -- Check is_system column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'is_system'
    ) INTO has_is_system;

    -- Check delete policy
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'message_requests' 
        AND policyname = 'Users can delete incoming requests'
    ) INTO has_delete_policy;

    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'chats' 
        AND policyname = 'Users can create chats'
    ) INTO has_chat_insert;

    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'chat_participants' 
        AND policyname = 'Users can join chats'
    ) INTO has_participant_insert;

    -- Report results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION VERIFICATION:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'is_system column exists: %', has_is_system;
    RAISE NOTICE 'DELETE policy exists: %', has_delete_policy;
    RAISE NOTICE 'Chats insert policy exists: %', has_chat_insert;
    RAISE NOTICE 'Chat participants insert policy exists: %', has_participant_insert;
    RAISE NOTICE '========================================';

    IF has_is_system AND has_delete_policy AND has_chat_insert AND has_participant_insert THEN
        RAISE NOTICE '✅ ALL FEATURES SUCCESSFULLY ADDED!';
    ELSE
        RAISE WARNING '⚠️ Some features may be missing. Check logs above.';
    END IF;
END $$;

COMMIT;

-- =====================================================
-- DONE! Your data is safe and new features are added.
-- =====================================================
