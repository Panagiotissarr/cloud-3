import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Lab {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabContent {
  id: string;
  lab_id: string;
  type: "webpage" | "text" | "markdown";
  title: string;
  content: string;
  url: string | null;
  created_at: string;
}

export function useLabs() {
  const { user } = useAuth();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load labs from database
  const loadLabs = useCallback(async () => {
    if (!user) {
      setLabs([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("labs")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!error && data) {
        setLabs(data);
      }
    } catch (e) {
      console.error("Failed to load labs:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLabs();
  }, [loadLabs]);

  const createLab = async (name: string, description?: string): Promise<Lab | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("labs")
      .insert({
        user_id: user.id,
        name,
        description: description || null,
      })
      .select()
      .single();

    if (!error && data) {
      setLabs((prev) => [data, ...prev]);
      return data;
    }
    return null;
  };

  const updateLab = async (labId: string, updates: { name?: string; description?: string }) => {
    if (!user) return false;

    const { error } = await supabase
      .from("labs")
      .update(updates)
      .eq("id", labId);

    if (!error) {
      setLabs((prev) =>
        prev.map((lab) =>
          lab.id === labId ? { ...lab, ...updates } : lab
        )
      );
      return true;
    }
    return false;
  };

  const deleteLab = async (labId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from("labs")
      .delete()
      .eq("id", labId);

    if (!error) {
      setLabs((prev) => prev.filter((lab) => lab.id !== labId));
      if (selectedLabId === labId) {
        setSelectedLabId(null);
      }
      return true;
    }
    return false;
  };

  const getLabContent = async (labId: string): Promise<LabContent[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("lab_content")
      .select("*")
      .eq("lab_id", labId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data as LabContent[];
    }
    return [];
  };

  const addLabContent = async (
    labId: string,
    type: "webpage" | "text" | "markdown",
    title: string,
    content: string,
    url?: string
  ): Promise<LabContent | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("lab_content")
      .insert({
        lab_id: labId,
        user_id: user.id,
        type,
        title,
        content,
        url: url || null,
      })
      .select()
      .single();

    if (!error && data) {
      return data as LabContent;
    }
    return null;
  };

  const deleteLabContent = async (contentId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from("lab_content")
      .delete()
      .eq("id", contentId);

    return !error;
  };

  // Get combined content from a lab for the system prompt
  const getLabContext = async (labId: string): Promise<string> => {
    const contents = await getLabContent(labId);
    if (contents.length === 0) return "";

    const lab = labs.find((l) => l.id === labId);
    let context = `[LAB CONTEXT: ${lab?.name || "Knowledge Base"}]\n\n`;

    contents.forEach((item, index) => {
      context += `--- ${item.type.toUpperCase()}: ${item.title} ---\n`;
      if (item.url) {
        context += `Source: ${item.url}\n`;
      }
      context += `${item.content}\n\n`;
    });

    context += "[END LAB CONTEXT]\n";
    return context;
  };

  return {
    labs,
    selectedLabId,
    setSelectedLabId,
    isLoading,
    loadLabs,
    createLab,
    updateLab,
    deleteLab,
    getLabContent,
    addLabContent,
    deleteLabContent,
    getLabContext,
  };
}
