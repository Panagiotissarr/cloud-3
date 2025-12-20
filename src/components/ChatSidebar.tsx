import { useState, useEffect } from "react";
import { Menu, Plus, Image, Settings, MessageSquare, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "./SettingsDialog";

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
}

const SIDEBAR_HOVER_AREA = 20; // pixels from left edge to trigger hover

export function ChatSidebar({
  userName,
  onUserNameChange,
  webSearchEnabled,
  onWebSearchToggle,
  onNewChat,
  currentChatId,
  chats,
  onSelectChat,
}: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllChats, setShowAllChats] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  // Auto-hide sidebar when mouse leaves
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientX <= SIDEBAR_HOVER_AREA && !isOpen) {
        setIsOpen(true);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isOpen]);

  const displayedChats = showAllChats ? chats : chats.slice(0, 10);

  return (
    <>
      {/* Hover trigger area */}
      <div 
        className="fixed left-0 top-0 bottom-0 w-5 z-40"
        onMouseEnter={() => setIsOpen(true)}
      />

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
        onMouseLeave={() => setIsOpen(false)}
      >
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
            className="w-full flex items-center gap-3 rounded-lg bg-muted text-muted-foreground px-4 py-3 hover:bg-muted/80 transition-colors"
          >
            <Image className="h-5 w-5" />
            <span className="font-medium">Image Gallery</span>
            <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Soon</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recent Chats
          </h3>
          
          {chats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No chats yet
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

        {/* Settings at Bottom */}
        <div className="p-4 border-t border-border">
          <SettingsDialog
            userName={userName}
            onUserNameChange={onUserNameChange}
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={onWebSearchToggle}
            variant="sidebar"
          />
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
