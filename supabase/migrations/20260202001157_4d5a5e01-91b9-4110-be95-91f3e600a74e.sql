-- Add a regular column for participant key
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS participant_key TEXT;

-- Create function to generate canonical participant key
CREATE OR REPLACE FUNCTION public.generate_participant_key(p_ids UUID[])
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT string_agg(id::text, '_' ORDER BY id)
  FROM unnest(p_ids) AS id;
$$;

-- Update existing conversations with their participant keys
UPDATE conversations
SET participant_key = public.generate_participant_key(participant_ids)
WHERE participant_key IS NULL;

-- Create trigger to auto-set participant_key on insert/update
CREATE OR REPLACE FUNCTION public.set_conversation_participant_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.participant_key := generate_participant_key(NEW.participant_ids);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_set_conversation_participant_key ON conversations;
CREATE TRIGGER tr_set_conversation_participant_key
  BEFORE INSERT OR UPDATE OF participant_ids ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_conversation_participant_key();

-- Create function to get or create a canonical conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_user_id_1 UUID,
  p_user_id_2 UUID,
  p_context_type TEXT DEFAULT NULL,
  p_context_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
  v_participant_key TEXT;
  v_sorted_ids UUID[];
BEGIN
  -- Prevent self-conversations
  IF p_user_id_1 = p_user_id_2 THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- Sort participant IDs
  IF p_user_id_1 < p_user_id_2 THEN
    v_sorted_ids := ARRAY[p_user_id_1, p_user_id_2];
  ELSE
    v_sorted_ids := ARRAY[p_user_id_2, p_user_id_1];
  END IF;
  
  v_participant_key := generate_participant_key(v_sorted_ids);

  -- Try to find existing conversation between these two users
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE participant_key = v_participant_key
  LIMIT 1;

  -- If found, return it
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation with sorted participant_ids
  INSERT INTO conversations (participant_ids, context_type, context_id)
  VALUES (v_sorted_ids, p_context_type, p_context_id)
  RETURNING id INTO v_conversation_id;

  RETURN v_conversation_id;
END;
$$;

-- Merge duplicate conversations: keep the one with most recent activity, move messages
DO $$
DECLARE
  dup RECORD;
  primary_convo_id UUID;
  duplicate_ids UUID[];
BEGIN
  -- Find all duplicate participant pairs
  FOR dup IN 
    SELECT participant_key, array_agg(id ORDER BY updated_at DESC) as convo_ids
    FROM conversations
    WHERE participant_key IS NOT NULL
    GROUP BY participant_key
    HAVING COUNT(*) > 1
  LOOP
    -- First conversation (most recently updated) is the primary
    primary_convo_id := dup.convo_ids[1];
    duplicate_ids := dup.convo_ids[2:];
    
    -- Move messages from duplicates to primary
    UPDATE messages 
    SET conversation_id = primary_convo_id
    WHERE conversation_id = ANY(duplicate_ids);
    
    -- Delete conversation_reads for duplicates (will be recreated)
    DELETE FROM conversation_reads
    WHERE conversation_id = ANY(duplicate_ids);
    
    -- Delete duplicate conversations
    DELETE FROM conversations 
    WHERE id = ANY(duplicate_ids);
    
    -- Update primary conversation's last_message and updated_at
    UPDATE conversations
    SET 
      last_message = (
        SELECT text FROM messages 
        WHERE conversation_id = primary_convo_id 
        ORDER BY created_at DESC LIMIT 1
      ),
      updated_at = COALESCE(
        (SELECT MAX(created_at) FROM messages WHERE conversation_id = primary_convo_id),
        conversations.updated_at
      )
    WHERE id = primary_convo_id;
  END LOOP;
END;
$$;

-- Add unique constraint on participant_key to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_participant_key_unique 
ON conversations (participant_key) 
WHERE participant_key IS NOT NULL;