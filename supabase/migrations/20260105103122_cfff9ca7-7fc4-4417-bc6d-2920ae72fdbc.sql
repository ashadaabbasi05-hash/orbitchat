-- Create function to safely create a chat between two users
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

-- Create chat_keys table for storing encrypted symmetric keys
CREATE TABLE public.chat_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chat_id)
);

-- Enable RLS on chat_keys
ALTER TABLE public.chat_keys ENABLE ROW LEVEL SECURITY;

-- Only chat participants can view keys for their chats
CREATE POLICY "Chat participants can view chat keys"
ON public.chat_keys
FOR SELECT
USING (is_chat_participant(auth.uid(), chat_id));

-- Only chat participants can insert keys
CREATE POLICY "Chat participants can insert chat keys"
ON public.chat_keys
FOR INSERT
WITH CHECK (is_chat_participant(auth.uid(), chat_id) AND auth.uid() = created_by);

-- Allow updating keys for chat participants
CREATE POLICY "Chat participants can update chat keys"
ON public.chat_keys
FOR UPDATE
USING (is_chat_participant(auth.uid(), chat_id));