import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Plus, Image, MessageSquare, ChevronRight, LogIn, LogOut, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "./SettingsDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Chat {
  id: string;
  title: string;
  timestamp: Date;
}

interface ChatSidebarProps {
  userName: string;
  onUserNameChange: (name: string) => void;
  webSearchEnabled: boolean;
  onWebSearchToggle: () => void;
  onNewChat: () => void;
  currentChatId: string | null;
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
  selectedVoice?: string;
  onVoiceChange?: (voiceId: string) => void;
}

export function ChatSidebar({
  userName,
  onUserNameChange,
  webSearchEnabled,
  onWebSearchToggle,
  onNewChat,
  currentChatId,
  chats,
  onSelectChat,
  selectedVoice,
  onVoiceChange,
}: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllChats, setShowAllChats] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  const { user, isAdmin, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    setIsOpen(false);
  };

  const displayedChats = showAllChats ? chats : chats.slice(0, 10);

  return (
    <>
      {/* Overlay when sidebar is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-72 bg-secondary border-r border-border z-50 flex flex-col transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-3 top-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* User Info */}
        <div className="p-4 pt-12 border-b border-border">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                {(profile?.username || user.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {profile?.username || user.email}
                </p>
                {isAdmin && (
                  <p className="text-xs text-primary">Admin</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sign in to save chats and generate images
            </p>
          )}
        </div>

        {/* Top Actions */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => {
              onNewChat();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 rounded-lg bg-primary text-primary-foreground px-4 py-3 hover:opacity-90 transition-opacity"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">New Chat</span>
          </button>

          <button
            onClick={() => setShowGalleryModal(true)}
            disabled={!user}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
              user 
                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
            )}
          >
            <Image className="h-5 w-5" />
            <span className="font-medium">Image Gallery</span>
            <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Soon</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                navigate("/admin");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 rounded-lg bg-primary/10 text-primary px-4 py-3 hover:bg-primary/20 transition-colors"
            >
              <Shield className="h-5 w-5" />
              <span className="font-medium">Admin Panel</span>
            </button>
          )}
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recent Chats
          </h3>
          
          {chats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {user ? "No chats yet" : "Sign in to save chats"}
            </p>
          ) : (
            <div className="space-y-1">
              {displayedChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    onSelectChat(chat.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    currentChatId === chat.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="text-sm truncate">{chat.title}</span>
                </button>
              ))}
              
              {chats.length > 10 && !showAllChats && (
                <button
                  onClick={() => setShowAllChats(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-muted transition-colors mt-2"
                >
                  <span>Show all ({chats.length})</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              
              {showAllChats && chats.length > 10 && (
                <button
                  onClick={() => setShowAllChats(false)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors mt-2"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-border space-y-2">
          <SettingsDialog
            userName={userName}
            onUserNameChange={onUserNameChange}
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={onWebSearchToggle}
            variant="sidebar"
            selectedVoice={selectedVoice}
            onVoiceChange={onVoiceChange}
          />
          
          {user ? (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 rounded-lg bg-muted text-muted-foreground px-4 py-3 hover:bg-muted/80 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => {
                navigate("/auth");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 rounded-lg bg-primary text-primary-foreground px-4 py-3 hover:opacity-90 transition-opacity"
            >
              <LogIn className="h-5 w-5" />
              <span className="font-medium">Sign In</span>
            </button>
          )}
        </div>
      </aside>

      {/* Menu button to open sidebar */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-all",
          isOpen && "opacity-0 pointer-events-none"
        )}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Coming Soon Modal for Gallery */}
      {showGalleryModal && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in"
          onClick={() => setShowGalleryModal(false)}
        >
          <div 
            className="bg-secondary rounded-2xl p-8 text-center max-w-sm mx-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-4">🖼️</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h3>
            <p className="text-muted-foreground">
              The image gallery feature is currently under development. Stay tuned!
            </p>
            <button
              onClick={() => setShowGalleryModal(false)}
              className="mt-6 px-6 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
