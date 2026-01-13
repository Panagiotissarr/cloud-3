import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Plus, Sparkles, MessageSquare, ChevronRight, LogIn, LogOut, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsDialog, GenderPronouns, TemperatureUnit } from "./SettingsDialog";
import { LabsManager } from "./LabsManager";
import { ColabManager } from "./ColabManager";
import { AIGallery } from "./AIGallery";
import { CloudPlusMenu } from "./CloudPlusMenu";
import { CLIChat } from "./CLIChat";
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
  userGender: GenderPronouns;
  onUserGenderChange: (gender: GenderPronouns) => void;
  webSearchEnabled: boolean;
  onWebSearchToggle: () => void;
  temperatureUnit: TemperatureUnit;
  onTemperatureUnitChange: (unit: TemperatureUnit) => void;
  cloudPlusEnabled: boolean;
  onCloudPlusToggle: () => void;
  onNewChat: () => void;
  currentChatId: string | null;
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
}

export function ChatSidebar({
  userName,
  onUserNameChange,
  userGender,
  onUserGenderChange,
  webSearchEnabled,
  onWebSearchToggle,
  temperatureUnit,
  onTemperatureUnitChange,
  cloudPlusEnabled,
  onCloudPlusToggle,
  onNewChat,
  currentChatId,
  chats,
  onSelectChat,
}: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllChats, setShowAllChats] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showLabsModal, setShowLabsModal] = useState(false);
  const [showColabModal, setShowColabModal] = useState(false);
  const [showCloudPlusMenu, setShowCloudPlusMenu] = useState(false);
  const [showCLIChat, setShowCLIChat] = useState(false);

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
                {(userName !== "User" ? userName : profile?.username || user.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {userName !== "User" ? userName : profile?.username || user.email}
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

          {cloudPlusEnabled && (
            <button
              onClick={() => {
                setShowCloudPlusMenu(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-foreground px-4 py-3 hover:from-primary/30 hover:to-accent/30 transition-all"
            >
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium">Cloud+</span>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </button>
          )}

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
            userGender={userGender}
            onUserGenderChange={onUserGenderChange}
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={onWebSearchToggle}
            temperatureUnit={temperatureUnit}
            onTemperatureUnitChange={onTemperatureUnitChange}
            cloudPlusEnabled={cloudPlusEnabled}
            onCloudPlusToggle={onCloudPlusToggle}
            variant="sidebar"
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

      {/* AI Gallery Modal */}
      {showGalleryModal && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in"
          onClick={() => setShowGalleryModal(false)}
        >
          <div 
            className="bg-secondary rounded-2xl max-w-4xl w-full mx-4 animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <AIGallery onClose={() => setShowGalleryModal(false)} />
          </div>
        </div>
      )}

      {/* Cloud Labs Modal */}
      {showLabsModal && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in"
          onClick={() => setShowLabsModal(false)}
        >
          <div 
            className="bg-secondary rounded-2xl max-w-3xl w-full mx-4 animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <LabsManager onClose={() => setShowLabsModal(false)} />
          </div>
        </div>
      )}

      {/* Cloud Colab Modal */}
      {showColabModal && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in"
          onClick={() => setShowColabModal(false)}
        >
          <div 
            className="bg-secondary rounded-2xl max-w-2xl w-full mx-4 h-[80vh] animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ColabManager 
              onClose={() => setShowColabModal(false)} 
              webSearchEnabled={webSearchEnabled}
              temperatureUnit={temperatureUnit}
            />
          </div>
        </div>
      )}

      {/* Cloud+ Menu */}
      {showCloudPlusMenu && (
        <CloudPlusMenu
          onClose={() => setShowCloudPlusMenu(false)}
          onOpenLabs={() => {
            setShowCloudPlusMenu(false);
            setShowLabsModal(true);
          }}
          onOpenColab={() => {
            setShowCloudPlusMenu(false);
            setShowColabModal(true);
          }}
          onOpenGallery={() => {
            setShowCloudPlusMenu(false);
            setShowGalleryModal(true);
          }}
          onOpenCLI={() => {
            setShowCloudPlusMenu(false);
            setShowCLIChat(true);
          }}
        />
      )}

      {/* CLI Chat */}
      {showCLIChat && (
        <CLIChat
          onClose={() => setShowCLIChat(false)}
          webSearchEnabled={webSearchEnabled}
          temperatureUnit={temperatureUnit}
        />
      )}
    </>
  );
}
