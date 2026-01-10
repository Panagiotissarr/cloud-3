-- Create function to update timestamps if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create labs table
CREATE TABLE public.labs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lab_content table for storing webpages, text, and documents
CREATE TABLE public.lab_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('webpage', 'text', 'markdown')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add lab_id to chats table (optional, null means no lab)
ALTER TABLE public.chats ADD COLUMN lab_id UUID REFERENCES public.labs(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_content ENABLE ROW LEVEL SECURITY;

-- RLS policies for labs (per-user private)
CREATE POLICY "Users can view their own labs"
ON public.labs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own labs"
ON public.labs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own labs"
ON public.labs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own labs"
ON public.labs FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for lab_content
CREATE POLICY "Users can view their own lab content"
ON public.lab_content FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lab content"
ON public.lab_content FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lab content"
ON public.lab_content FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lab content"
ON public.lab_content FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at on labs
CREATE TRIGGER update_labs_updated_at
BEFORE UPDATE ON public.labs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();