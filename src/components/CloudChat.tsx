import { useState, useRef, useEffect } from "react";
import { Cloud, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WEB_SEARCH_KEY = "cloud-web-search-enabled";

export function CloudChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(() => {
    const stored = localStorage.getItem(WEB_SEARCH_KEY);
    return stored === null ? true : stored === "true";
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(WEB_SEARCH_KEY, String(webSearchEnabled));
  }, [webSearchEnabled]);

  const toggleWebSearch = () => {
    setWebSearchEnabled((prev) => !prev);
    toast({
      title: webSearchEnabled ? "Web Search Disabled" : "Web Search Enabled",
      description: webSearchEnabled 
        ? "Cloud will now use its built-in knowledge only" 
        : "Cloud can now browse the web for current information",
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, { role: "user", content: userMessage }],
          webSearchEnabled,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast({
            title: "Rate Limited",
            description: "Too many requests. Please wait a moment.",
            variant: "destructive",
          });
        } else if (resp.status === 402) {
          toast({
            title: "Usage Limit",
            description: "Please add credits to continue using Cloud.",
            variant: "destructive",
          });
        }
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

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
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (!assistantContent) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "I apologize, but I couldn't generate a response. Please try again." },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2">
          <Cloud className="h-5 w-5 text-foreground" />
          <span className="font-medium text-foreground">Cloud</span>
        </div>
        <button
          onClick={toggleWebSearch}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2 transition-all",
            webSearchEnabled 
              ? "bg-secondary ring-2 ring-primary/50" 
              : "bg-secondary/50 opacity-60"
          )}
          title={webSearchEnabled ? "Web search enabled - click to disable" : "Web search disabled - click to enable"}
        >
          <GoogleIcon />
          {webSearchEnabled && (
            <span className="text-xs font-medium text-muted-foreground">Search</span>
          )}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        {!hasMessages ? (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <h1 className="text-5xl font-light tracking-tight text-foreground md:text-6xl">
              Hello I'm Cloud
            </h1>
            <p className="text-lg text-muted-foreground">Your AI Assistant</p>
            {webSearchEnabled && (
              <p className="text-sm text-primary/80 animate-fade-in">
                Web search enabled
              </p>
            )}
          </div>
        ) : (
          <div className="w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8">
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex animate-fade-in ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-secondary rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-soft" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-soft" style={{ animationDelay: "0.15s" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-soft" style={{ animationDelay: "0.3s" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className={`w-full max-w-2xl px-4 ${hasMessages ? "pb-8" : "mt-12"}`}>
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Me Anything"
              className="w-full rounded-full bg-secondary py-4 pl-6 pr-16 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between px-6 py-4 text-xs text-muted-foreground">
        <span>Cloud Can Make Mistakes</span>
        <span>Powered by Google Gemini</span>
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
