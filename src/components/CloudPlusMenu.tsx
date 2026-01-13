import { useState, useEffect } from "react";
import { Sparkles, Terminal, FlaskConical, Users, Image, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface CloudPlusMenuProps {
  onClose: () => void;
  onOpenLabs: () => void;
  onOpenColab: () => void;
  onOpenGallery: () => void;
  onOpenCLI: () => void;
}

function TypewriterText({ text, delay = 50, className }: { text: string; delay?: number; className?: string }) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, delay]);

  return (
    <span className={className}>
      {displayText}
      {currentIndex < text.length && (
        <span className="animate-pulse">▊</span>
      )}
    </span>
  );
}

function MenuOption({ 
  icon: Icon, 
  label, 
  description, 
  onClick, 
  delay,
  disabled 
}: { 
  icon: React.ElementType; 
  label: string; 
  description: string; 
  onClick: () => void;
  delay: number;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group w-full flex items-center gap-4 p-4 rounded-xl border border-border/50 transition-all duration-300",
        "hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02]",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100 hover:border-border/50 hover:bg-transparent",
        "animate-fade-in"
      )}
    >
      <div className={cn(
        "flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors",
        "group-hover:bg-primary group-hover:text-primary-foreground",
        disabled && "group-hover:bg-primary/10 group-hover:text-primary"
      )}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 text-left">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className={cn(
        "h-5 w-5 text-muted-foreground transition-transform",
        "group-hover:translate-x-1 group-hover:text-primary",
        disabled && "group-hover:translate-x-0 group-hover:text-muted-foreground"
      )} />
    </button>
  );
}

export function CloudPlusMenu({ onClose, onOpenLabs, onOpenColab, onOpenGallery, onOpenCLI }: CloudPlusMenuProps) {
  const { user } = useAuth();
  const [showTitle, setShowTitle] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);

  useEffect(() => {
    const titleTimeout = setTimeout(() => setShowTitle(true), 100);
    const subtitleTimeout = setTimeout(() => setShowSubtitle(true), 800);
    return () => {
      clearTimeout(titleTimeout);
      clearTimeout(subtitleTimeout);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[70] flex items-center justify-center animate-fade-in">
      <div className="relative max-w-lg w-full mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header with typing animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            {showTitle && (
              <h1 className="text-3xl font-bold text-foreground">
                <TypewriterText text="Cloud+" delay={80} />
              </h1>
            )}
          </div>
          {showSubtitle && (
            <p className="text-muted-foreground animate-fade-in">
              <TypewriterText text="Premium features for enhanced AI experiences" delay={30} />
            </p>
          )}
        </div>

        {/* Menu options */}
        <div className="space-y-3">
          <MenuOption
            icon={Terminal}
            label="CLI Chat"
            description="Terminal-style chat interface"
            onClick={onOpenCLI}
            delay={1500}
          />
          <MenuOption
            icon={FlaskConical}
            label="Cloud Labs"
            description="Create custom knowledge bases"
            onClick={onOpenLabs}
            delay={1700}
            disabled={!user}
          />
          <MenuOption
            icon={Users}
            label="Cloud Colab"
            description="Real-time collaborative chat sessions"
            onClick={onOpenColab}
            delay={1900}
            disabled={!user}
          />
          <MenuOption
            icon={Image}
            label="AI Gallery"
            description="View your generated images"
            onClick={onOpenGallery}
            delay={2100}
            disabled={!user}
          />
        </div>

        {!user && (
          <p className="text-center text-sm text-muted-foreground mt-6 animate-fade-in" style={{ animationDelay: "2.3s" }}>
            Sign in to access all Cloud+ features
          </p>
        )}
      </div>
    </div>
  );
}