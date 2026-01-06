import { useState, useRef, useEffect } from "react";
import { Cloud, Send, Image, X, Mic, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChatSidebar } from "./ChatSidebar";
import { VoiceInterface } from "./VoiceInterface";
import { WeatherCard } from "./WeatherCard";
import { useAuth } from "@/contexts/AuthContext";
import { useChats, Message, MessageContent } from "@/hooks/useChats";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { GenderPronouns, TemperatureUnit } from "./SettingsDialog";

const USER_NAME_KEY = "cloud-user-name";
const USER_GENDER_KEY = "cloud-user-gender";
const WEB_SEARCH_KEY = "cloud-web-search-enabled";
const TEMP_UNIT_KEY = "cloud-temperature-unit";

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

// Parse weather data from message content
interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}

const parseWeatherFromText = (text: string): { cleanText: string; weather: WeatherData | null } => {
  const weatherMatch = text.match(/\[WEATHER_DATA\]([\s\S]*?)\[\/WEATHER_DATA\]/);
  if (!weatherMatch) return { cleanText: text, weather: null };
  
  try {
    const weather = JSON.parse(weatherMatch[1]);
    const cleanText = text.replace(/\[WEATHER_DATA\][\s\S]*?\[\/WEATHER_DATA\]/, '').trim();
    return { cleanText, weather };
  } catch {
    return { cleanText: text, weather: null };
  }
};

// Parse image gallery from message content
const parseImagesFromText = (text: string): { cleanText: string; images: string[] } => {
  const imageMatch = text.match(/\[IMAGE_GALLERY\]([\s\S]*?)\[\/IMAGE_GALLERY\]/);
  if (!imageMatch) return { cleanText: text, images: [] };
  
  try {
    const images = JSON.parse(imageMatch[1]);
    const cleanText = text.replace(/\[IMAGE_GALLERY\][\s\S]*?\[\/IMAGE_GALLERY\]/, '').trim();
    return { cleanText, images: Array.isArray(images) ? images : [] };
  } catch {
    return { cleanText: text, images: [] };
  }
};

// Generate chat title from first message
const generateChatTitle = (message: Message): string => {
  const content = typeof message.content === "string" 
    ? message.content 
    : (message.content as MessageContent[]).find(c => c.type === "text")?.text || "New Chat";
  return content.slice(0, 40) + (content.length > 40 ? "..." : "");
};

export function CloudChat() {
  const { user, profile, isCreator } = useAuth();
  const {
    chats,
    currentChatId,
    messages,
    setMessages,
    createChat,
    addMessage,
    updateLastMessage,
    saveAssistantMessage,
    selectChat,
    newChat,
  } = useChats();
  
  const {
    isConnected: isVoiceConnected,
    isSpeaking,
    stopConversation,
  } = useVoiceChat();

  const [isVoiceInterfaceOpen, setIsVoiceInterfaceOpen] = useState(false);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(() => {
    const stored = localStorage.getItem(WEB_SEARCH_KEY);
    return stored === null ? true : stored === "true";
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem(USER_NAME_KEY) || "User";
  });
  const [userGender, setUserGender] = useState<GenderPronouns>(() => {
    return (localStorage.getItem(USER_GENDER_KEY) as GenderPronouns) || "prefer-not-to-say";
  });
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>(() => {
    return (localStorage.getItem(TEMP_UNIT_KEY) as TemperatureUnit) || "celsius";
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

  useEffect(() => {
    localStorage.setItem(USER_GENDER_KEY, userGender);
  }, [userGender]);

  useEffect(() => {
    localStorage.setItem(TEMP_UNIT_KEY, temperatureUnit);
  }, [temperatureUnit]);

  // Update userName when profile loads
  useEffect(() => {
    if (profile?.display_name) {
      setUserName(profile.display_name);
    }
  }, [profile]);

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
    newChat();
    setInput("");
    setImagePreview(null);
  };

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if user is logged in for image generation
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to use image features.",
        variant: "destructive",
      });
      return;
    }

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

  // Get personalized greeting for creator
  const getGreeting = () => {
    if (isCreator && profile) {
      return `Hello ${profile.display_name || profile.username}! How may I assist you Creator?`;
    }
    if (userName !== "User") {
      return `Hello ${userName}, I'm Cloud`;
    }
    return "Hello I'm Cloud";
  };

  // Get user preferences context for Cloud
  const getUserPreferences = () => {
    const preferences: { userName?: string; pronouns?: string } = {};
    
    if (userName !== "User") {
      preferences.userName = userName;
    }
    
    if (userGender !== "prefer-not-to-say") {
      preferences.pronouns = userGender;
    }
    
    return preferences;
  };

  // Get personalized system message for creator
  const getSystemContext = () => {
    if (isCreator && profile) {
      return `You are speaking with your creator, ${profile.display_name || profile.username}. Be extra warm, friendly, and appreciative. Address them as your creator and show gratitude for creating you.`;
    }
    return "";
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
      const title = generateChatTitle(newUserMessage);
      await createChat(title, newUserMessage);
    } else {
      await addMessage(currentChatId, newUserMessage);
    }

    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

      const apiMessages = [...messages, { role: "user" as const, content: apiMessageContent }];

      // Add creator context if applicable
      const systemContext = getSystemContext();
      const userPreferences = getUserPreferences();

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: apiMessages, 
          webSearchEnabled,
          systemContext,
          userPreferences,
          isCreator,
          temperatureUnit
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
              updateLastMessage(assistantContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message to database (without adding to messages state again)
      if (currentChatId && assistantContent) {
        await saveAssistantMessage(currentChatId, assistantContent);
      }

      if (!assistantContent) {
        const errorMessage = { role: "assistant" as const, content: "I apologize, but I couldn't generate a response. Please try again." };
        setMessages((prev) => [...prev, errorMessage]);
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
        userGender={userGender}
        onUserGenderChange={setUserGender}
        webSearchEnabled={webSearchEnabled}
        onWebSearchToggle={toggleWebSearch}
        temperatureUnit={temperatureUnit}
        onTemperatureUnitChange={setTemperatureUnit}
        onNewChat={handleNewChat}
        currentChatId={currentChatId}
        chats={chats}
        onSelectChat={handleSelectChat}
      />

      {/* Voice Interface */}
      <VoiceInterface
        isOpen={isVoiceInterfaceOpen}
        onClose={() => setIsVoiceInterfaceOpen(false)}
      />

      {/* Header */}
      <header className="flex items-center justify-end px-6 py-4">
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
              {getGreeting()}
            </h1>
            {!user && (
              <p className="text-muted-foreground text-center max-w-md">
                Sign in to save your chats and generate images
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
                    {typeof message.content === "string" ? (
                      (() => {
                        const { cleanText: textWithoutImages, images } = parseImagesFromText(message.content);
                        const { cleanText, weather } = parseWeatherFromText(textWithoutImages);
                        return (
                          <div className="space-y-3">
                            {images.length > 0 && message.role === "assistant" && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                                {images.map((url, imgIndex) => (
                                  <a
                                    key={imgIndex}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
                                  >
                                    <img
                                      src={url}
                                      alt={`Result ${imgIndex + 1}`}
                                      className="w-full h-24 sm:h-32 object-cover bg-muted"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                            {cleanText && (
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                {formatText(cleanText)}
                              </p>
                            )}
                            {weather && message.role === "assistant" && (
                              <WeatherCard weather={weather} unit={temperatureUnit} />
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-2">
                        {(message.content as MessageContent[]).map((part, partIndex) =>
                          part.type === "text" ? (
                            (() => {
                              const { cleanText, weather } = parseWeatherFromText(part.text || "");
                              return (
                                <div key={partIndex} className="space-y-3">
                                  {cleanText && (
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                      {formatText(cleanText)}
                                    </p>
                                  )}
                                  {weather && message.role === "assistant" && (
                                    <WeatherCard weather={weather} unit={temperatureUnit} />
                                  )}
                                </div>
                              );
                            })()
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
          {/* Voice Status Indicator */}
          {isVoiceConnected && (
            <div className="mb-2 flex items-center justify-center gap-2 text-sm text-muted-foreground animate-fade-in">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span>{isSpeaking ? "Cloud is speaking..." : "Listening..."}</span>
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
              disabled={isLoading || !user}
              className={cn(
                "absolute left-3 flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                user 
                  ? "text-muted-foreground hover:text-foreground disabled:opacity-50"
                  : "text-muted-foreground/50 cursor-not-allowed"
              )}
              title={user ? "Upload image" : "Sign in to upload images"}
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
              disabled={isLoading || isVoiceConnected}
            />
            {/* Dynamic button: Voice when empty & logged in, Send when has text, End call when connected */}
            {isVoiceConnected ? (
              <button
                onClick={stopConversation}
                className="absolute right-1 flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-all hover:opacity-90"
                title="End voice chat"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            ) : !input.trim() && !imagePreview && user ? (
              <button
                onClick={() => setIsVoiceInterfaceOpen(true)}
                disabled={isLoading}
                className="absolute right-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                title="Start voice chat"
              >
                <Mic className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={(!input.trim() && !imagePreview) || isLoading}
                className="absolute right-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            )}
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
