import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VOICE_PREFERENCE_KEY = "selected_voice_preference";

export const AVAILABLE_VOICES = [
  { id: "xctasy8XvGp2cVO9HL9k", name: "English" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily" },
] as const;

export function useVoiceChat() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem(VOICE_PREFERENCE_KEY) || AVAILABLE_VOICES[0].id;
  });

  useEffect(() => {
    localStorage.setItem(VOICE_PREFERENCE_KEY, selectedVoice);
  }, [selectedVoice]);

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs agent");
      toast.success("Voice chat connected");
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs agent");
      toast.info("Voice chat ended");
    },
    onMessage: (message) => {
      console.log("Message from agent:", message);
    },
    onError: (error) => {
      console.error("ElevenLabs error:", error);
      toast.error("Voice chat error occurred");
    },
  });

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-conversation-token"
      );

      if (error) {
        // supabase.functions.invoke returns a generic message for non-2xx responses.
        // Try to extract the JSON body our backend function returns.
        const contextBody = (error as any)?.context?.body;
        const contextError =
          typeof contextBody === "string"
            ? (() => {
                try {
                  return JSON.parse(contextBody)?.error;
                } catch {
                  return undefined;
                }
              })()
            : contextBody?.error;

        const message = contextError || error.message || "Failed to get conversation token";
        console.error("Error getting token:", message, error);
        throw new Error(message);
      }

      if (!data?.token) {
        throw new Error("No token received");
      }

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start voice chat");
    } finally {
      setIsConnecting(false);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isConnected = conversation.status === "connected";
  const isSpeaking = conversation.isSpeaking;

  return {
    isConnecting,
    isConnected,
    isSpeaking,
    startConversation,
    stopConversation,
    selectedVoice,
    setSelectedVoice,
  };
}
