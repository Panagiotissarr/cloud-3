import { useState, useRef, useEffect } from "react";
import { Cloud, Send, Image, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChatSidebar } from "./ChatSidebar";

const USER_NAME_KEY = "cloud-user-name";
const WEB_SEARCH_KEY = "cloud-web-search-enabled";
const CHATS_STORAGE_KEY = "cloud-chat-history";

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

interface Chat {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
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

// Generate chat title from first message
const generateChatTitle = (message: Message): string => {
  const content = typeof message.content === "string" 
    ? message.content 
    : message.content.find(c => c.type === "text")?.text || "New Chat";
  return content.slice(0, 40) + (content.length > 40 ? "..." : "");
};

// Load chats from localStorage
const loadChats = (): Chat[] => {
  try {
    const stored = localStorage.getItem(CHATS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((chat: any) => ({
        ...chat,
        timestamp: new Date(chat.timestamp)
      }));
    }
  } catch (e) {
    console.error("Failed to load chats:", e);
  }
  return [];
};

// Save chats to localStorage
const saveChats = (chats: Chat[]) => {
  try {
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
  } catch (e) {
    console.error("Failed to save chats:", e);
  }
};

export function CloudChat() {
  const [chats, setChats] = useState<Chat[]>(() => loadChats());
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
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

  useEffect(() => {
    localStorage.setItem(USER_NAME_KEY, userName);
  }, [userName]);

  // Save chats whenever they change
  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  // Update current chat messages when messages change
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages, timestamp: new Date() }
          : chat
      ));
    }
  }, [messages, currentChatId]);

  const toggleWebSearch = () => {
    setWebSearchEnabled((prev) => !prev);
    toast({
      title: webSearchEnabled ? "Web Search Disabled" : "Web Search Enabled",
      description: webSearchEnabled
        ? "Cloud will now use its built-in knowledge only"
        : "Cloud can now browse the web for current information",
    });
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setInput("");
    setImagePreview(null);
  };

  const handleSelectChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview({
        file,
        dataUrl: reader.result as string,
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
    if ((!input.trim() && !imagePreview) || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Build message content
    let messageContent: string | MessageContent[];
    let apiMessageContent: string | MessageContent[];

    if (imagePreview) {
      const contentParts: MessageContent[] = [];
      if (userMessage) {
        contentParts.push({ type: "text", text: userMessage });
      }
      contentParts.push({
        type: "image_url",
        image_url: { url: imagePreview.dataUrl },
      });
      messageContent = contentParts;
      apiMessageContent = contentParts;
    } else {
      messageContent = userMessage;
      apiMessageContent = userMessage;
    }

    const newUserMessage: Message = { role: "user", content: messageContent };

    // Create new chat if this is the first message
    if (!currentChatId) {
      const newChatId = crypto.randomUUID();
      const newChat: Chat = {
        id: newChatId,
        title: generateChatTitle(newUserMessage),
        timestamp: new Date(),
        messages: [newUserMessage],
      };
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChatId);
    }

    setMessages((prev) => [...prev, newUserMessage]);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

      const apiMessages = [...messages, { role: "user" as const, content: apiMessageContent }];

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages, webSearchEnabled }),
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
          {
            role: "assistant",
            content: "I apologize, but I couldn't generate a response. Please try again.",
          },
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
      {/* Sidebar */}
      <ChatSidebar
        userName={userName}
        onUserNameChange={setUserName}
        webSearchEnabled={webSearchEnabled}
        onWebSearchToggle={toggleWebSearch}
        onNewChat={handleNewChat}
        currentChatId={currentChatId}
        chats={chats}
        onSelectChat={handleSelectChat}
      />

      {/* Header */}
      <header className="flex items-center justify-center px-6 py-4">
        <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2">
          <Cloud className="h-5 w-5 text-foreground" />
          <span className="font-medium text-foreground">Cloud</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        {!hasMessages ? (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <h1 className="text-5xl tracking-tight text-foreground text-center font-sans font-thin md:text-7xl">
              Hello I'm Cloud
            </h1>
            {webSearchEnabled}
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
                    {typeof message.content === "string" ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {formatText(message.content)}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {message.content.map((part, partIndex) =>
                          part.type === "text" ? (
                            <p
                              key={partIndex}
                              className="whitespace-pre-wrap text-sm leading-relaxed"
                            >
                              {formatText(part.text || "")}
                            </p>
                          ) : part.type === "image_url" && part.image_url ? (
                            <img
                              key={partIndex}
                              src={part.image_url.url}
                              alt="Uploaded"
                              className="max-w-full rounded-lg max-h-64 object-contain"
                            />
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-secondary rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-soft" />
                      <span
                        className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-soft"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-soft"
                        style={{ animationDelay: "0.3s" }}
                      />
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
          {/* Image Preview */}
          {imagePreview && (
            <div className="mb-2 flex items-start gap-2 animate-fade-in">
              <div className="relative">
                <img
                  src={imagePreview.dataUrl}
                  alt="Preview"
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <button
                  onClick={removeImage}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          <div className="relative flex items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="absolute left-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Upload image"
            >
              <Image className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Me Anything"
              className="w-full rounded-full bg-secondary py-4 pl-14 pr-16 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={(!input.trim() && !imagePreview) || isLoading}
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
        <span>Made By Panagiotis Powerd By Gemini</span>
      </footer>
    </div>
  );
}
