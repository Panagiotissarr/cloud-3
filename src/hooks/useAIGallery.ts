import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface AIGeneratedImage {
  id: string;
  prompt: string;
  image_url: string;
  created_at: string;
}

export function useAIGallery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [images, setImages] = useState<AIGeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchImages = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_generated_images")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error("Error fetching AI images:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const saveImage = async (prompt: string, imageUrl: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save images to your gallery.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase.from("ai_generated_images").insert({
        user_id: user.id,
        prompt,
        image_url: imageUrl,
      });

      if (error) throw error;

      toast({
        title: "Image saved",
        description: "The image has been saved to your gallery.",
      });

      await fetchImages();
      return true;
    } catch (error) {
      console.error("Error saving image:", error);
      toast({
        title: "Error",
        description: "Failed to save image. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("ai_generated_images")
        .delete()
        .eq("id", imageId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Image deleted",
        description: "The image has been removed from your gallery.",
      });

      setImages((prev) => prev.filter((img) => img.id !== imageId));
      return true;
    } catch (error) {
      console.error("Error deleting image:", error);
      toast({
        title: "Error",
        description: "Failed to delete image. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    images,
    isLoading,
    saveImage,
    deleteImage,
    refetch: fetchImages,
  };
}
