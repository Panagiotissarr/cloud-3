-- Create table for storing AI-generated images
CREATE TABLE public.ai_generated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_generated_images ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own AI images" 
ON public.ai_generated_images 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can save their own AI images" 
ON public.ai_generated_images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI images" 
ON public.ai_generated_images 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_ai_images_user_id ON public.ai_generated_images(user_id);
CREATE INDEX idx_ai_images_created_at ON public.ai_generated_images(created_at DESC);