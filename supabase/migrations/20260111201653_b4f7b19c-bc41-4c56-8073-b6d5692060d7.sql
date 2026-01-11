-- Create colab_sessions table
CREATE TABLE public.colab_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Colab Session',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create colab_participants table
CREATE TABLE public.colab_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.colab_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Create colab_messages table for real-time chat
CREATE TABLE public.colab_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.colab_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sender_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.colab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colab_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colab_messages ENABLE ROW LEVEL SECURITY;

-- RLS for colab_sessions: participants can view their sessions
CREATE POLICY "Users can view sessions they participate in"
ON public.colab_sessions FOR SELECT
USING (
  id IN (SELECT session_id FROM public.colab_participants WHERE user_id = auth.uid())
  OR created_by = auth.uid()
);

CREATE POLICY "Users can create sessions"
ON public.colab_sessions FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their sessions"
ON public.colab_sessions FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their sessions"
ON public.colab_sessions FOR DELETE
USING (auth.uid() = created_by);

-- RLS for colab_participants
CREATE POLICY "Users can view participants in their sessions"
ON public.colab_participants FOR SELECT
USING (
  session_id IN (SELECT session_id FROM public.colab_participants WHERE user_id = auth.uid())
  OR session_id IN (SELECT id FROM public.colab_sessions WHERE created_by = auth.uid())
);

CREATE POLICY "Users can join sessions"
ON public.colab_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave sessions"
ON public.colab_participants FOR DELETE
USING (auth.uid() = user_id);

-- RLS for colab_messages
CREATE POLICY "Participants can view messages in their sessions"
ON public.colab_messages FOR SELECT
USING (
  session_id IN (SELECT session_id FROM public.colab_participants WHERE user_id = auth.uid())
  OR session_id IN (SELECT id FROM public.colab_sessions WHERE created_by = auth.uid())
);

CREATE POLICY "Participants can send messages"
ON public.colab_messages FOR INSERT
WITH CHECK (
  (auth.uid() = user_id OR user_id IS NULL) AND
  (session_id IN (SELECT session_id FROM public.colab_participants WHERE user_id = auth.uid())
   OR session_id IN (SELECT id FROM public.colab_sessions WHERE created_by = auth.uid()))
);

-- Create trigger for updated_at on colab_sessions
CREATE TRIGGER update_colab_sessions_updated_at
BEFORE UPDATE ON public.colab_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for colab_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.colab_messages;

-- Create function to lookup session by code (for joining)
CREATE OR REPLACE FUNCTION public.get_session_by_code(session_code TEXT)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, code, name, created_by, created_at
  FROM public.colab_sessions
  WHERE code = session_code;
$$;