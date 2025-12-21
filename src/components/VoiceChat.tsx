import { useConversation } from "@elevenlabs/react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function VoiceChat() {
  const [isConnecting, setIsConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs agent");
      toast.success("Connected to voice agent");
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs agent");
      toast.info("Disconnected from voice agent");
    },
    onMessage: (message) => {
      console.log("Message from agent:", message);
    },
    onError: (error) => {
      console.error("ElevenLabs error:", error);
      toast.error("Voice agent error occurred");
    },
  });

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get token from edge function
      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-conversation-token"
      );

      if (error) {
        console.error("Error getting token:", error);
        throw new Error(error.message || "Failed to get conversation token");
      }

      if (!data?.token) {
        throw new Error("No token received");
      }

      console.log("Starting conversation with token");

      // Start the conversation with WebRTC
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

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div 
          className={`h-2 w-2 rounded-full ${
            isConnected ? "bg-green-500 animate-pulse" : "bg-muted"
          }`} 
        />
        <span>
          {isConnected 
            ? conversation.isSpeaking 
              ? "Agent is speaking..." 
              : "Listening..."
            : "Disconnected"
          }
        </span>
      </div>

      <div className="flex gap-2">
        {!isConnected ? (
          <Button
            onClick={startConversation}
            disabled={isConnecting}
            size="lg"
            className="gap-2"
          >
            {isConnecting ? (
              <>
                <Phone className="h-5 w-5 animate-pulse" />
                Connecting...
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                Start Voice Chat
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={stopConversation}
            variant="destructive"
            size="lg"
            className="gap-2"
          >
            <PhoneOff className="h-5 w-5" />
            End Call
          </Button>
        )}
      </div>

      {isConnected && (
        <div className="flex items-center gap-2 mt-2">
          {conversation.isSpeaking ? (
            <MicOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Mic className="h-4 w-4 text-primary animate-pulse" />
          )}
          <span className="text-xs text-muted-foreground">
            {conversation.isSpeaking ? "Agent speaking" : "Your turn to speak"}
          </span>
        </div>
      )}
    </div>
  );
}
