import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ApiKey {
  id: string;
  api_key: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export function useApiKey() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApiKey = useCallback(async () => {
    if (!user) {
      setApiKey(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setApiKey(data);
    } catch (error) {
      console.error("Error fetching API key:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchApiKey();
  }, [fetchApiKey]);

  const generateApiKey = async () => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please sign in to generate an API key",
        variant: "destructive",
      });
      return null;
    }

    try {
      // Generate a secure random API key
      const keyBytes = new Uint8Array(32);
      crypto.getRandomValues(keyBytes);
      const newKey = `cloud_${Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;

      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          user_id: user.id,
          api_key: newKey,
          name: "Default API Key",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "API key already exists",
            description: "You already have an API key. Delete it first to generate a new one.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return null;
      }

      setApiKey(data);
      toast({
        title: "API key generated",
        description: "Your new API key has been created successfully",
      });
      return data;
    } catch (error) {
      console.error("Error generating API key:", error);
      toast({
        title: "Error",
        description: "Failed to generate API key",
        variant: "destructive",
      });
      return null;
    }
  };

  const revokeApiKey = async () => {
    if (!user || !apiKey) return false;

    try {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", apiKey.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setApiKey(null);
      toast({
        title: "API key revoked",
        description: "Your API key has been deleted",
      });
      return true;
    } catch (error) {
      console.error("Error revoking API key:", error);
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    apiKey,
    isLoading,
    generateApiKey,
    revokeApiKey,
    refreshApiKey: fetchApiKey,
  };
}
