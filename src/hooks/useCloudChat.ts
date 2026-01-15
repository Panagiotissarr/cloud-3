import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CloudChatMessage {
  id: string;
  session_id: string;
  user_id: string | null;
  guest_name: string | null;
  content: string;
  created_at: string;
  updated_at: string | null;
}

interface CloudChatSession {
  id: string;
  code: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export function useCloudChat() {
  const { user, profile } = useAuth();
  const [session, setSession] = useState<CloudChatSession | null>(null);
  const [messages, setMessages] = useState<CloudChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [guestName, setGuestName] = useState<string>("");

  // Load messages for current session
  const loadMessages = useCallback(async (sessionId: string) => {
    const { data, error } = await supabase
      .from("cloud_chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages(data || []);
  }, []);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!session) return;

    loadMessages(session.id);

    const channel = supabase
      .channel(`cloud_chat_${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cloud_chat_messages",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as CloudChatMessage]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cloud_chat_messages",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? (payload.new as CloudChatMessage) : msg
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "cloud_chat_messages",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, loadMessages]);

  // Create a new session
  const createSession = async (name: string = "Cloud Chat") => {
    if (!user) {
      toast.error("You must be logged in to create a chat");
      return null;
    }

    setIsLoading(true);
    const code = generateCode();

    const { data, error } = await supabase
      .from("cloud_chat_sessions")
      .insert({
        code,
        name,
        created_by: user.id,
      })
      .select()
      .single();

    setIsLoading(false);

    if (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create chat session");
      return null;
    }

    setSession(data);
    setMessages([]);
    toast.success(`Chat created! Code: ${code}`);
    return data;
  };

  // Join a session by code
  const joinSession = async (code: string) => {
    setIsLoading(true);

    const { data, error } = await supabase.rpc("get_chat_session_by_code", {
      session_code: code.toUpperCase(),
    });

    setIsLoading(false);

    if (error || !data || data.length === 0) {
      toast.error("Chat session not found");
      return null;
    }

    const sessionData = data[0] as CloudChatSession;
    setSession(sessionData);
    toast.success(`Joined: ${sessionData.name}`);
    return sessionData;
  };

  // Send a message
  const sendMessage = async (content: string) => {
    if (!session) {
      toast.error("No active chat session");
      return false;
    }

    if (!user && !guestName) {
      toast.error("Please set your name first");
      return false;
    }

    const { error } = await supabase.from("cloud_chat_messages").insert({
      session_id: session.id,
      user_id: user?.id || null,
      guest_name: user ? null : guestName,
      content,
    });

    if (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      return false;
    }

    return true;
  };

  // Edit a message
  const editMessage = async (messageId: string, newContent: string) => {
    if (!user) {
      toast.error("You must be logged in to edit messages");
      return false;
    }

    const { error } = await supabase
      .from("cloud_chat_messages")
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error editing message:", error);
      toast.error("Failed to edit message");
      return false;
    }

    return true;
  };

  // Delete a message
  const deleteMessage = async (messageId: string) => {
    if (!user) {
      toast.error("You must be logged in to delete messages");
      return false;
    }

    const { error } = await supabase
      .from("cloud_chat_messages")
      .delete()
      .eq("id", messageId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
      return false;
    }

    toast.success("Message deleted");
    return true;
  };

  // Leave the session
  const leaveSession = () => {
    setSession(null);
    setMessages([]);
  };

  return {
    session,
    messages,
    isLoading,
    guestName,
    setGuestName,
    createSession,
    joinSession,
    sendMessage,
    editMessage,
    deleteMessage,
    leaveSession,
    user,
    profile,
  };
}
