import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Users, Copy, Check, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useColab, ColabSession, ColabMessage } from "@/hooks/useColab";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { GenderPronouns, TemperatureUnit } from "./SettingsDialog";

interface ColabChatProps {
  session: ColabSession;
  onBack: () => void;
  webSearchEnabled: boolean;
  temperatureUnit: TemperatureUnit;
}

export function ColabChat({ session, onBack, webSearchEnabled, temperatureUnit }: ColabChatProps) {
  const { user, profile, isCreator } = useAuth();
  const { messages, participants, sendMessage } = useColab();
  const { toast } = useToast();
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(session.code);
    setCopied(true);
    toast({ title: "Code copied!", description: `Share "${session.code}" with others to join.` });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Send user message
    await sendMessage(userMessage, "user");
    
    // Check if message is directed at Cloud (starts with @cloud or mentions Cloud)
    const isForCloud = userMessage.toLowerCase().includes("@cloud") || 
                       userMessage.toLowerCase().startsWith("cloud,") ||
                       userMessage.toLowerCase().startsWith("cloud ");
    
    if (isForCloud) {
      setIsLoading(true);
      
      try {
        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
        
        // Build context from recent messages
        const recentMessages = messages.slice(-10).map((m) => ({
          role: m.role === "system" ? "user" : m.role,
          content: m.role === "user" ? `${m.sender_name}: ${m.content}` : m.content,
        }));
        
        recentMessages.push({ role: "user", content: `${profile?.display_name || profile?.username || "User"}: ${userMessage}` });

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: recentMessages,
            webSearchEnabled,
            systemContext: "You are in a group chat called Cloud Colab. Multiple users are chatting together. When users mention @Cloud or address you directly, respond helpfully. Be conversational and friendly. Address users by their names when you can.",
            userPreferences: {},
            isCreator,
            temperatureUnit,
          }),
        });

        if (resp.ok) {
          const reader = resp.body?.getReader();
          if (reader) {
            const decoder = new TextDecoder();
            let assistantContent = "";
            let textBuffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              textBuffer += decoder.decode(value, { stream: true });

              let newlineIndex: number;
              while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
                let line = textBuffer.slice(0, newlineIndex);
                textBuffer = textBuffer.slice(newlineIndex + 1);

                if (line.endsWith("\r")) line = line.slice(0, -1);
                if (line.startsWith(":") || line.trim() === "") continue;
                if (!line.startsWith("data: ")) continue;

                const jsonStr = line.slice(6).trim();
                if (jsonStr === "[DONE]") break;

                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content as string | undefined;
                  if (content) {
                    assistantContent += content;
                  }
                } catch {
                  textBuffer = line + "\n" + textBuffer;
                  break;
                }
              }
            }

            if (assistantContent) {
              await sendMessage(assistantContent, "assistant");
            }
          }
        }
      } catch (error) {
        console.error("Error getting Cloud response:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground">{session.name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{participants.length} participants</span>
            </div>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={copyCode}
          className="gap-2"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span className="font-mono">{session.code}</span>
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex animate-fade-in",
              message.role === "system" ? "justify-center" :
              message.user_id === user?.id ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "system" ? (
              <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                {message.content}
              </div>
            ) : (
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2",
                  message.role === "assistant"
                    ? "bg-secondary text-secondary-foreground"
                    : message.user_id === user?.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {message.role !== "assistant" && message.user_id !== user?.id && (
                  <p className="text-xs font-medium opacity-70 mb-1">{message.sender_name}</p>
                )}
                {message.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Cloud className="h-3 w-3" />
                    <p className="text-xs font-medium opacity-70">Cloud</p>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-secondary rounded-2xl px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Cloud className="h-3 w-3" />
                <p className="text-xs font-medium opacity-70">Cloud</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.15s" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Hint */}
      <div className="px-4 pb-2">
        <p className="text-xs text-muted-foreground text-center">
          Mention <span className="font-medium text-primary">@Cloud</span> to get Cloud's response
        </p>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="relative flex items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="pr-12 rounded-full"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="absolute right-1 h-8 w-8 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
