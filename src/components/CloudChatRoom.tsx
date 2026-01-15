import { useState, useRef, useEffect } from "react";
import { MessageSquare, Copy, LogOut, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCloudChat } from "@/hooks/useCloudChat";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import { marked } from "marked";

// Configure marked for safe HTML
marked.setOptions({
  breaks: true,
  gfm: true,
});

interface CloudChatRoomProps {
  onClose: () => void;
}

export function CloudChatRoom({ onClose }: CloudChatRoomProps) {
  const {
    session,
    messages,
    isLoading,
    guestName,
    setGuestName,
    createSession,
    joinSession,
    sendMessage,
    leaveSession,
    user,
    profile,
  } = useCloudChat();

  const [view, setView] = useState<"menu" | "create" | "join" | "guest-name" | "chat">("menu");
  const [sessionName, setSessionName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [pendingJoinCode, setPendingJoinCode] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCreate = async () => {
    const result = await createSession(sessionName || "Cloud Chat");
    if (result) {
      setView("chat");
    }
  };

  const handleJoin = async () => {
    if (!user && !guestName) {
      setPendingJoinCode(joinCode);
      setView("guest-name");
      return;
    }
    const result = await joinSession(joinCode);
    if (result) {
      setView("chat");
    }
  };

  const handleSetGuestName = async () => {
    if (!guestName.trim()) {
      toast.error("Please enter a name");
      return;
    }
    const result = await joinSession(pendingJoinCode);
    if (result) {
      setView("chat");
    }
  };

  const handleSend = async () => {
    if (!messageInput.trim()) return;
    const success = await sendMessage(messageInput);
    if (success) {
      setMessageInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyCode = () => {
    if (session) {
      navigator.clipboard.writeText(session.code);
      toast.success("Code copied!");
    }
  };

  const handleLeave = () => {
    leaveSession();
    setView("menu");
    setSessionName("");
    setJoinCode("");
    setPendingJoinCode("");
  };

  const handleClose = () => {
    leaveSession();
    onClose();
  };

  const renderMessage = (content: string) => {
    const html = marked.parse(content) as string;
    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "code", "pre", "a", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "img", "span", "div"],
      ALLOWED_ATTR: ["href", "src", "alt", "class", "style", "target"],
    });
    return { __html: sanitized };
  };

  const getSenderName = (msg: { user_id: string | null; guest_name: string | null }) => {
    if (msg.guest_name) return msg.guest_name;
    if (msg.user_id === user?.id) return profile?.display_name || profile?.username || "You";
    return "User";
  };

  // Menu view
  if (view === "menu") {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[80] flex items-center justify-center animate-fade-in">
        <div className="max-w-md w-full mx-4 space-y-6">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Cloud Chat</h2>
            <p className="text-muted-foreground mt-2">
              Public chat rooms with markdown support
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Messages are deleted after 7 days
            </p>
          </div>

          <div className="space-y-3">
            {user && (
              <Button
                onClick={() => setView("create")}
                className="w-full h-14 text-lg"
                size="lg"
              >
                Create Chat Room
              </Button>
            )}
            <Button
              onClick={() => setView("join")}
              variant="outline"
              className="w-full h-14 text-lg"
              size="lg"
            >
              Join with Code
            </Button>
            <Button
              onClick={handleClose}
              variant="ghost"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Create view
  if (view === "create") {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[80] flex items-center justify-center animate-fade-in">
        <div className="max-w-md w-full mx-4 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Create Chat Room</h2>
            <p className="text-muted-foreground mt-2">
              Give your room a name
            </p>
          </div>

          <div className="space-y-4">
            <Input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Room name (optional)"
              className="h-12 text-lg"
            />
            <Button
              onClick={handleCreate}
              disabled={isLoading}
              className="w-full h-12"
            >
              {isLoading ? "Creating..." : "Create Room"}
            </Button>
            <Button
              onClick={() => setView("menu")}
              variant="ghost"
              className="w-full"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Join view
  if (view === "join") {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[80] flex items-center justify-center animate-fade-in">
        <div className="max-w-md w-full mx-4 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Join Chat Room</h2>
            <p className="text-muted-foreground mt-2">
              Enter the 5-character code
            </p>
          </div>

          <div className="space-y-4">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="XXXXX"
              maxLength={5}
              className="h-16 text-2xl text-center font-mono tracking-widest uppercase"
            />
            <Button
              onClick={handleJoin}
              disabled={isLoading || joinCode.length !== 5}
              className="w-full h-12"
            >
              {isLoading ? "Joining..." : "Join Room"}
            </Button>
            <Button
              onClick={() => setView("menu")}
              variant="ghost"
              className="w-full"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Guest name view
  if (view === "guest-name") {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[80] flex items-center justify-center animate-fade-in">
        <div className="max-w-md w-full mx-4 space-y-6">
          <div className="text-center">
            <User className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold">What's your name?</h2>
            <p className="text-muted-foreground mt-2">
              Enter a display name for the chat
            </p>
          </div>

          <div className="space-y-4">
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your name"
              className="h-12 text-lg"
              maxLength={30}
            />
            <Button
              onClick={handleSetGuestName}
              disabled={isLoading || !guestName.trim()}
              className="w-full h-12"
            >
              {isLoading ? "Joining..." : "Continue"}
            </Button>
            <Button
              onClick={() => setView("join")}
              variant="ghost"
              className="w-full"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="fixed inset-0 bg-background z-[80] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">{session?.name}</h3>
            <button
              onClick={copyCode}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-mono">{session?.code}</span>
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLeave}>
          <LogOut className="h-4 w-4 mr-2" />
          Leave
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.user_id === user?.id || (msg.guest_name && msg.guest_name === guestName);
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1",
                    isOwn ? "items-end" : "items-start"
                  )}
                >
                  <span className="text-xs text-muted-foreground px-2">
                    {getSenderName(msg)}
                  </span>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2 prose prose-sm dark:prose-invert",
                      isOwn
                        ? "bg-primary text-primary-foreground prose-headings:text-primary-foreground prose-p:text-primary-foreground prose-strong:text-primary-foreground"
                        : "bg-muted"
                    )}
                    dangerouslySetInnerHTML={renderMessage(msg.content)}
                  />
                  <span className="text-xs text-muted-foreground px-2">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Markdown supported)"
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!messageInput.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
