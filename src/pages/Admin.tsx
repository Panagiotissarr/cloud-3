import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, MessageSquare, Eye, Shield, Bot, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  is_creator: boolean;
  created_at: string;
}

interface ChatPreview {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
}

interface MessagePreview {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export default function Admin() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userChats, setUserChats] = useState<ChatPreview[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null);
  const [chatMessages, setChatMessages] = useState<MessagePreview[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        toast({
          title: "Access Denied",
          description: "You don't have admin.",
          variant: "destructive",
        });
        navigate("/");
      } else {
        fetchUsers();
      }
    }
  }, [user, isAdmin, isLoading, navigate]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Filter out creator accounts (their data is protected)
      setUsers(data.filter((u) => !u.is_creator));
    }
    setLoadingUsers(false);
  };

  const fetchUserChats = async (userId: string) => {
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUserChats(data);
    }
  };

  const fetchChatMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setChatMessages(data);
    }
  };

  const handleSelectUser = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setSelectedChat(null);
    setChatMessages([]);
    fetchUserChats(userProfile.id);
  };

  const handleSelectChat = (chat: ChatPreview) => {
    setSelectedChat(chat);
    fetchChatMessages(chat.id);
  };

  const handleBack = () => {
    if (selectedChat) {
      setSelectedChat(null);
      setChatMessages([]);
    } else if (selectedUser) {
      setSelectedUser(null);
      setUserChats([]);
    } else {
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Admin Panel</h1>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-muted-foreground">
          <button onClick={() => { setSelectedUser(null); setSelectedChat(null); }} className="hover:text-foreground">
            Users
          </button>
          {selectedUser && (
            <>
              <span className="mx-2">/</span>
              <button onClick={() => setSelectedChat(null)} className="hover:text-foreground">
                {selectedUser.username}
              </button>
            </>
          )}
          {selectedChat && (
            <>
              <span className="mx-2">/</span>
              <span className="text-foreground">{selectedChat.title}</span>
            </>
          )}
        </div>

        {/* Content */}
        {!selectedUser ? (
          // Users List
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users ({users.length})
            </h2>
            {loadingUsers ? (
              <div className="text-muted-foreground">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-muted-foreground">No users found.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className="flex items-center gap-4 rounded-lg border border-border bg-secondary p-4 text-left hover:bg-secondary/80 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{u.username}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Eye className="h-5 w-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : !selectedChat ? (
          // User's Chats
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {selectedUser.username}'s Chats ({userChats.length})
            </h2>
            {userChats.length === 0 ? (
              <div className="text-muted-foreground">No chats found for this user.</div>
            ) : (
              <div className="space-y-2">
                {userChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    className="w-full flex items-center gap-4 rounded-lg border border-border bg-secondary p-4 text-left hover:bg-secondary/80 transition-colors"
                  >
                    <MessageSquare className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{chat.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(chat.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Eye className="h-5 w-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Chat Messages
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">
              Chat: {selectedChat.title}
            </h2>
            <div className="space-y-4 max-w-3xl">
              {chatMessages.map((msg) => {
                // Parse content if it's JSON (for mixed content types)
                let displayContent = msg.content;
                try {
                  const parsed = JSON.parse(msg.content);
                  if (Array.isArray(parsed)) {
                    displayContent = parsed
                      .filter((item: any) => item.type === "text")
                      .map((item: any) => item.text)
                      .join("\n");
                  }
                } catch {
                  // Content is plain text, use as-is
                }

                const isUser = msg.role === "user";
                const isAssistant = msg.role === "assistant";

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {/* Avatar for assistant */}
                    {isAssistant && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground border border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium opacity-70">
                          {isUser ? "User" : "Cloud"}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{displayContent}</p>
                      <p className="text-xs opacity-50 mt-2">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>

                    {/* Avatar for user */}
                    {isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
              {chatMessages.length === 0 && (
                <div className="text-muted-foreground">No messages in this chat.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
