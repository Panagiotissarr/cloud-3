import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string | MessageContent[];
}

export interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface Chat {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
}

const LOCAL_CHATS_KEY = "cloud-guest-chats";

export function useChats() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load chats from database or localStorage
  useEffect(() => {
    if (user) {
      loadChatsFromDB();
    } else {
      loadLocalChats();
    }
  }, [user]);

  const loadLocalChats = () => {
    try {
      const stored = localStorage.getItem(LOCAL_CHATS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setChats(parsed.map((c: any) => ({ ...c, timestamp: new Date(c.timestamp) })));
      }
    } catch (e) {
      console.error("Failed to load local chats:", e);
    }
  };

  const loadChatsFromDB = async () => {
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      const chatsWithMessages = await Promise.all(
        data.map(async (chat) => {
          const { data: msgs } = await supabase
            .from("messages")
            .select("*")
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: true });

          return {
            id: chat.id,
            title: chat.title,
            timestamp: new Date(chat.updated_at),
            messages: (msgs || []).map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          };
        })
      );
      setChats(chatsWithMessages);
    }
  };

  const saveLocalChats = useCallback((updatedChats: Chat[]) => {
    try {
      localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(updatedChats));
    } catch (e) {
      console.error("Failed to save local chats:", e);
    }
  }, []);

  const createChat = async (title: string, firstMessage: Message) => {
    const chatId = crypto.randomUUID();

    if (user) {
      // Save to database
      const { error: chatError } = await supabase.from("chats").insert({
        id: chatId,
        user_id: user.id,
        title,
      });

      if (!chatError) {
        const messageContent = typeof firstMessage.content === "string"
          ? firstMessage.content
          : JSON.stringify(firstMessage.content);

        await supabase.from("messages").insert({
          chat_id: chatId,
          user_id: user.id,
          role: firstMessage.role,
          content: messageContent,
        });
      }
    }

    const newChat: Chat = {
      id: chatId,
      title,
      timestamp: new Date(),
      messages: [firstMessage],
    };

    setChats((prev) => {
      const updated = [newChat, ...prev];
      if (!user) saveLocalChats(updated);
      return updated;
    });
    setCurrentChatId(chatId);
    setMessages([firstMessage]);

    return chatId;
  };

  const addMessage = async (chatId: string, message: Message) => {
    if (user) {
      const messageContent = typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content);

      await supabase.from("messages").insert({
        chat_id: chatId,
        user_id: user.id,
        role: message.role,
        content: messageContent,
      });

      // Update chat timestamp
      await supabase
        .from("chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", chatId);
    }

    setMessages((prev) => [...prev, message]);
    setChats((prev) => {
      const updated = prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, message], timestamp: new Date() }
          : c
      );
      if (!user) saveLocalChats(updated);
      return updated;
    });
  };

  const updateLastMessage = (content: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") {
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
      }
      return [...prev, { role: "assistant" as const, content }];
    });
  };

  const selectChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
    }
  };

  const newChat = () => {
    setCurrentChatId(null);
    setMessages([]);
  };

  return {
    chats,
    currentChatId,
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    createChat,
    addMessage,
    updateLastMessage,
    selectChat,
    newChat,
  };
}
