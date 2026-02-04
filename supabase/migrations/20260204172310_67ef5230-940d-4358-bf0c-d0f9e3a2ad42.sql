-- Create table for API keys (1 per user)
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  api_key TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT 'Default API Key',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create table for data feed
CREATE TABLE public.api_data_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_data_feed ENABLE ROW LEVEL SECURITY;

-- RLS policies for api_keys
CREATE POLICY "Users can view their own API key"
ON public.api_keys FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API key"
ON public.api_keys FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API key"
ON public.api_keys FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own API key"
ON public.api_keys FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for api_data_feed
CREATE POLICY "Users can view their own data feed"
ON public.api_data_feed FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data"
ON public.api_data_feed FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data"
ON public.api_data_feed FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own data"
ON public.api_data_feed FOR DELETE
USING (auth.uid() = user_id);

-- Function to get user_id from API key (for edge function use)
CREATE OR REPLACE FUNCTION public.get_user_id_from_api_key(key TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.api_keys WHERE api_key = key
$$;

-- Function to update last_used_at
CREATE OR REPLACE FUNCTION public.update_api_key_last_used(key TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.api_keys SET last_used_at = now() WHERE api_key = key
$$;

-- Trigger for updated_at on api_data_feed
CREATE TRIGGER update_api_data_feed_updated_at
BEFORE UPDATE ON public.api_data_feed
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();