import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ColabSession {
  id: string;
  code: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface ColabParticipant {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
  profile?: {
    username: string;
    display_name: string | null;
  };
}

export interface ColabMessage {
  id: string;
  session_id: string;
  user_id: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  sender_name: string | null;
  created_at: string;
}

// Generate a random 5-character alphanumeric code
const generateCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluded confusing chars like 0, O, 1, I
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export function useColab() {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<ColabSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ColabSession | null>(null);
  const [messages, setMessages] = useState<ColabMessage[]>([]);
  const [participants, setParticipants] = useState<ColabParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load user's colab sessions
  const loadSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      return;
    }

    const { data, error } = await supabase
      .from("colab_sessions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setSessions(data);
    }
  }, [user]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Subscribe to real-time messages when in a session
  useEffect(() => {
    if (!currentSession) return;

    const channel = supabase
      .channel(`colab-${currentSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "colab_messages",
          filter: `session_id=eq.${currentSession.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ColabMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession]);

  // Create a new colab session
  const createSession = async (name?: string): Promise<ColabSession | null> => {
    if (!user) return null;

    const code = generateCode();
    const sessionName = name || `Colab ${code}`;

    const { data, error } = await supabase
      .from("colab_sessions")
      .insert({
        code,
        name: sessionName,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      return null;
    }

    // Add creator as participant
    await supabase.from("colab_participants").insert({
      session_id: data.id,
      user_id: user.id,
    });

    // Add system message
    await supabase.from("colab_messages").insert({
      session_id: data.id,
      role: "system",
      content: `${profile?.display_name || profile?.username || "Someone"} created this colab session.`,
    });

    setSessions((prev) => [data, ...prev]);
    return data;
  };

  // Join a session by code
  const joinSession = async (code: string): Promise<ColabSession | null> => {
    if (!user) return null;

    setIsLoading(true);
    try {
      // Look up session by code using RPC function
      const { data: sessionData, error: lookupError } = await supabase
        .rpc("get_session_by_code", { session_code: code.toUpperCase() });

      if (lookupError || !sessionData || sessionData.length === 0) {
        console.error("Session not found:", lookupError);
        return null;
      }

      const session = sessionData[0] as ColabSession;

      // Check if already a participant
      const { data: existingParticipant } = await supabase
        .from("colab_participants")
        .select("id")
        .eq("session_id", session.id)
        .eq("user_id", user.id)
        .single();

      if (!existingParticipant) {
        // Add as participant
        await supabase.from("colab_participants").insert({
          session_id: session.id,
          user_id: user.id,
        });

        // Add join message
        await supabase.from("colab_messages").insert({
          session_id: session.id,
          role: "system",
          content: `${profile?.display_name || profile?.username || "Someone"} joined the colab.`,
        });
      }

      await loadSessions();
      return session;
    } finally {
      setIsLoading(false);
    }
  };

  // Enter a session (load messages and participants)
  const enterSession = async (session: ColabSession) => {
    setCurrentSession(session);
    setIsLoading(true);

    try {
      // Load messages
      const { data: messagesData } = await supabase
        .from("colab_messages")
        .select("*")
        .eq("session_id", session.id)
        .order("created_at", { ascending: true });

      setMessages((messagesData || []) as ColabMessage[]);

      // Load participants
      const { data: participantsData } = await supabase
        .from("colab_participants")
        .select(`
          id,
          session_id,
          user_id,
          joined_at
        `)
        .eq("session_id", session.id);

      setParticipants(participantsData || []);
    } finally {
      setIsLoading(false);
    }
  };

  // Leave current session view (not the session itself)
  const leaveSessionView = () => {
    setCurrentSession(null);
    setMessages([]);
    setParticipants([]);
  };

  // Send a message to the current session
  const sendMessage = async (content: string, role: "user" | "assistant" = "user") => {
    if (!currentSession || !user) return null;

    const senderName = role === "user" 
      ? profile?.display_name || profile?.username || "Anonymous"
      : "Cloud";

    const { data, error } = await supabase
      .from("colab_messages")
      .insert({
        session_id: currentSession.id,
        user_id: role === "user" ? user.id : null,
        role,
        content,
        sender_name: senderName,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return null;
    }

    return data;
  };

  // Delete a session
  const deleteSession = async (sessionId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from("colab_sessions")
      .delete()
      .eq("id", sessionId);

    if (!error) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        leaveSessionView();
      }
      return true;
    }
    return false;
  };

  return {
    sessions,
    currentSession,
    messages,
    participants,
    isLoading,
    createSession,
    joinSession,
    enterSession,
    leaveSessionView,
    sendMessage,
    deleteSession,
    loadSessions,
  };
}
