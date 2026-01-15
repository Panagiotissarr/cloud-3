-- Create cloud_chat_sessions table
CREATE TABLE public.cloud_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Cloud Chat',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cloud_chat_messages table
CREATE TABLE public.cloud_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.cloud_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cloud_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for cloud_chat_sessions
CREATE POLICY "Anyone can view chat sessions by code"
  ON public.cloud_chat_sessions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create sessions"
  ON public.cloud_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their sessions"
  ON public.cloud_chat_sessions FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their sessions"
  ON public.cloud_chat_sessions FOR DELETE
  USING (auth.uid() = created_by);

-- RLS policies for cloud_chat_messages
CREATE POLICY "Anyone can view messages in sessions"
  ON public.cloud_chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can send messages"
  ON public.cloud_chat_messages FOR INSERT
  WITH CHECK (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.cloud_chat_messages;

-- Create function to get session by code (for guests)
CREATE OR REPLACE FUNCTION public.get_chat_session_by_code(session_code TEXT)
RETURNS TABLE (id UUID, code TEXT, name TEXT, created_by UUID, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, code, name, created_by, created_at
  FROM public.cloud_chat_sessions
  WHERE code = session_code;
$$;

-- Create function to delete old messages (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.cloud_chat_messages
  WHERE created_at < now() - INTERVAL '7 days';
END;
$$;

-- Create trigger to update updated_at
CREATE TRIGGER update_cloud_chat_sessions_updated_at
  BEFORE UPDATE ON public.cloud_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();