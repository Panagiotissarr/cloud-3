import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  createdAt: number;
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isOpen,
  onToggle,
}: ChatSidebarProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((acc, session) => {
    const dateLabel = formatDate(session.createdAt);
    if (!acc[dateLabel]) acc[dateLabel] = [];
    acc[dateLabel].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  return (
    <>
      {/* Toggle button - always visible */}
      <button
        onClick={onToggle}
        className={cn(
          "fixed top-4 left-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-all",
          isOpen && "left-[268px]"
        )}
        title={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-[260px] bg-secondary/50 backdrop-blur-sm border-r border-border transition-transform duration-300",
          !isOpen && "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col p-4">
          {/* New Chat Button */}
          <Button
            onClick={onNewChat}
            className="mb-4 w-full gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>

          {/* Sessions List */}
          <ScrollArea className="flex-1 -mx-2">
            <div className="space-y-4 px-2">
              {Object.entries(groupedSessions).map(([dateLabel, dateSessions]) => (
                <div key={dateLabel}>
                  <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                    {dateLabel}
                  </p>
                  <div className="space-y-1">
                    {dateSessions.map((session) => (
                      <div
                        key={session.id}
                        className={cn(
                          "group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-colors",
                          activeSessionId === session.id
                            ? "bg-primary/10 text-foreground"
                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => onSelectSession(session.id)}
                      >
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate text-sm">
                          {session.title}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                          title="Delete chat"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {sessions.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                  No chat history yet
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
