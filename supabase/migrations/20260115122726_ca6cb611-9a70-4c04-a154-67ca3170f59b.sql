-- Add RLS policies for UPDATE and DELETE on cloud_chat_messages
-- Users can only edit/delete their own messages (by user_id or matching guest_name session)

CREATE POLICY "Users can update their own messages"
  ON public.cloud_chat_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.cloud_chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at column for tracking edits
ALTER TABLE public.cloud_chat_messages 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Enable realtime for UPDATE and DELETE events
ALTER TABLE public.cloud_chat_messages REPLICA IDENTITY FULL;