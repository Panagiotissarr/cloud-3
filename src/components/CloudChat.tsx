import { useState, useRef, useEffect } from "react";
import { Cloud, Send, Image, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "./SettingsDialog";
const USER_NAME_KEY = "cloud-user-name";
interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}
interface Message {
  role: "user" | "assistant";
  content: string | MessageContent[];
}
interface ImagePreview {
  file: File;
  dataUrl: string;
}

// Parse markdown-style bold text (**text**)
const formatText = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};
const WEB_SEARCH_KEY = "cloud-web-search-enabled";
export function CloudChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(() => {
    const stored = localStorage.getItem(WEB_SEARCH_KEY);
    return stored === null ? true : stored === "true";
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem(USER_NAME_KEY) || "User";
  });
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    toast
  } = useToast();
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    localStorage.setItem(WEB_SEARCH_KEY, String(webSearchEnabled));
  }, [webSearchEnabled]);
  useEffect(() => {
    localStorage.setItem(USER_NAME_KEY, userName);
  }, [userName]);
  const toggleWebSearch = () => {
    setWebSearchEnabled(prev => !prev);
    toast({
      title: webSearchEnabled ? "Web Search Disabled" : "Web Search Enabled",
      description: webSearchEnabled ? "Cloud will now use its built-in knowledge only" : "Cloud can now browse the web for current information"
    });
  };
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB",
        variant: "destructive"
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview({
        file,
        dataUrl: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };
  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const sendMessage = async () => {
    if (!input.trim() && !imagePreview || isLoading) return;
    const userMessage = input.trim();
    setInput("");

    // Build message content
    let messageContent: string | MessageContent[];
    let apiMessageContent: string | MessageContent[];
    if (imagePreview) {
      const contentParts: MessageContent[] = [];
      if (userMessage) {
        contentParts.push({
          type: "text",
          text: userMessage
        });
      }
      contentParts.push({
        type: "image_url",
        image_url: {
          url: imagePreview.dataUrl
        }
      });
      messageContent = contentParts;
      apiMessageContent = contentParts;
    } else {
      messageContent = userMessage;
      apiMessageContent = userMessage;
    }
    setMessages(prev => [...prev, {
      role: "user",
      content: messageContent
    }]);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsLoading(true);
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

      // Build messages for API - convert complex content to API format
      const apiMessages = [...messages, {
        role: "user" as const,
        content: apiMessageContent
      }];
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          messages: apiMessages,
          webSearchEnabled
        })
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast({
            title: "Rate Limited",
            description: "Too many requests. Please wait a moment.",
            variant: "destructive"
          });
        } else if (resp.status === 402) {
          toast({
            title: "Usage Limit",
            description: "Please add credits to continue using Cloud.",
            variant: "destructive"
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
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, {
          stream: true
        });
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
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? {
                    ...m,
                    content: assistantContent
                  } : m);
                }
                return [...prev, {
                  role: "assistant",
                  content: assistantContent
                }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
      if (!assistantContent) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "I apologize, but I couldn't generate a response. Please try again."
        }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
      }]);
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
  return <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2">
          <Cloud className="h-5 w-5 text-foreground" />
          <span className="font-medium text-foreground">Cloud</span>
        </div>
        <SettingsDialog userName={userName} onUserNameChange={setUserName} webSearchEnabled={webSearchEnabled} onWebSearchToggle={toggleWebSearch} />
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        {!hasMessages ? <div className="flex flex-col items-center gap-4 animate-fade-in">
            <h1 className="text-5xl tracking-tight text-foreground text-center font-sans font-thin md:text-7xl">Hello I'm Cloud

        </h1>
            
            {webSearchEnabled}
          </div> : <div className="w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8">
            <div className="space-y-6">
              {messages.map((message, index) => <div key={index} className={`flex animate-fade-in ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {typeof message.content === "string" ? <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {formatText(message.content)}
                      </p> : <div className="space-y-2">
                        {message.content.map((part, partIndex) => part.type === "text" ? <p key={partIndex} className="whitespace-pre-wrap text-sm leading-relaxed">
                              {formatText(part.text || "")}
                            </p> : part.type === "image_url" && part.image_url ? <img key={partIndex} src={part.image_url.url} alt="Uploaded" className="max-w-full rounded-lg max-h-64 object-contain" /> : null)}
                      </div>}
                  </div>
                </div>)}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && <div className="flex justify-start animate-fade-in">
                  <div className="bg-secondary rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-soft" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-soft" style={{
                  animationDelay: "0.15s"
                }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-soft" style={{
                  animationDelay: "0.3s"
                }} />
                    </div>
                  </div>
                </div>}
              <div ref={messagesEndRef} />
            </div>
          </div>}

        {/* Input Area */}
        <div className={`w-full max-w-2xl px-4 ${hasMessages ? "pb-8" : "mt-12"}`}>
          {/* Image Preview */}
          {imagePreview && <div className="mb-2 flex items-start gap-2 animate-fade-in">
              <div className="relative">
                <img src={imagePreview.dataUrl} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
                <button onClick={removeImage} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>}
          <div className="relative flex items-center">
            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="absolute left-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50" title="Upload image">
              <Image className="h-5 w-5" />
            </button>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask Me Anything" className="w-full rounded-full bg-secondary py-4 pl-14 pr-16 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" disabled={isLoading} />
            <button onClick={sendMessage} disabled={!input.trim() && !imagePreview || isLoading} className="absolute right-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50">
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between px-6 py-4 text-xs text-muted-foreground">
        <span>Cloud Can Make Mistakes</span>
        <span>Made By Panagiotis Powerd By Gemini</span>
      </footer>
    </div>;
}
function GoogleIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>;
}