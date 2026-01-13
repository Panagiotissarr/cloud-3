import { useState, useEffect, useRef } from "react";
import { X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CLIChatProps {
  onClose: () => void;
  webSearchEnabled: boolean;
  temperatureUnit: string;
}

interface TerminalLine {
  type: "system" | "user" | "assistant" | "error";
  content: string;
  timestamp?: Date;
}

function TypewriterLine({ 
  content, 
  onComplete,
  speed = 15 
}: { 
  content: string; 
  onComplete?: () => void;
  speed?: number;
}) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < content.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + content[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, content, speed, onComplete]);

  return (
    <span>
      {displayText}
      {currentIndex < content.length && (
        <span className="animate-pulse text-primary">▊</span>
      )}
    </span>
  );
}

export function CLIChat({ onClose, webSearchEnabled, temperatureUnit }: CLIChatProps) {
  const { user, profile } = useAuth();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bootSequence = [
    "Cloud CLI v1.0.0",
    "Initializing neural networks...",
    "Loading language models...",
    "Connecting to Cloud servers...",
    "═══════════════════════════════════════════════════════",
    "",
    "  ██████╗██╗      ██████╗ ██╗   ██╗██████╗ ",
    " ██╔════╝██║     ██╔═══██╗██║   ██║██╔══██╗",
    " ██║     ██║     ██║   ██║██║   ██║██║  ██║",
    " ██║     ██║     ██║   ██║██║   ██║██║  ██║",
    " ╚██████╗███████╗╚██████╔╝╚██████╔╝██████╔╝",
    "  ╚═════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ ",
    "",
    "═══════════════════════════════════════════════════════",
    "",
    "© 2024-2026 Cloud AI. All rights reserved.",
    "Created by Panagiotis (Sarr)",
    "",
    "Type your message and press Enter to chat.",
    "Type 'help' for available commands.",
    "Type 'clear' to clear the terminal.",
    "Type 'exit' to close the CLI.",
    "",
    "Ready for input...",
    ""
  ];

  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < bootSequence.length) {
        setLines(prev => [...prev, { type: "system", content: bootSequence[currentLine] }]);
        currentLine++;
      } else {
        clearInterval(interval);
        setBootComplete(true);
        inputRef.current?.focus();
      }
    }, 80);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const handleCommand = async (command: string) => {
    const trimmedCommand = command.trim().toLowerCase();
    
    // Add user input line
    setLines(prev => [...prev, { 
      type: "user", 
      content: `$ ${command}`,
      timestamp: new Date()
    }]);

    if (trimmedCommand === "help") {
      setLines(prev => [...prev, 
        { type: "system", content: "" },
        { type: "system", content: "Available commands:" },
        { type: "system", content: "  help    - Show this help message" },
        { type: "system", content: "  clear   - Clear the terminal" },
        { type: "system", content: "  exit    - Close the CLI" },
        { type: "system", content: "  about   - About Cloud AI" },
        { type: "system", content: "" },
        { type: "system", content: "Or just type any message to chat with Cloud!" },
        { type: "system", content: "" },
      ]);
      return;
    }

    if (trimmedCommand === "clear") {
      setLines([{ type: "system", content: "Terminal cleared. Ready for input..." }, { type: "system", content: "" }]);
      return;
    }

    if (trimmedCommand === "exit") {
      onClose();
      return;
    }

    if (trimmedCommand === "about") {
      setLines(prev => [...prev,
        { type: "system", content: "" },
        { type: "system", content: "╔══════════════════════════════════════╗" },
        { type: "system", content: "║         CLOUD AI - CLI MODE          ║" },
        { type: "system", content: "╠══════════════════════════════════════╣" },
        { type: "system", content: "║  Version: 1.0.0                      ║" },
        { type: "system", content: "║  Creator: Panagiotis (Sarr)          ║" },
        { type: "system", content: "║  Model: google/gemini-2.5-flash      ║" },
        { type: "system", content: "╚══════════════════════════════════════╝" },
        { type: "system", content: "" },
      ]);
      return;
    }

    if (!command.trim()) return;

    // Send to AI
    setIsTyping(true);
    setLines(prev => [...prev, { type: "system", content: "Processing..." }]);

    try {
      const response = await supabase.functions.invoke("chat", {
        body: {
          messages: [{ role: "user", content: command }],
          webSearchEnabled,
          temperatureUnit,
          isCreator: profile?.is_creator || false,
          cloudPlusEnabled: true,
        },
      });

      if (response.error) throw response.error;

      // Handle streaming response
      const reader = response.data.getReader?.();
      if (reader) {
        const decoder = new TextDecoder();
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines_data = chunk.split("\n");

          for (const line of lines_data) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                }
              } catch (e) {
                // Skip parse errors
              }
            }
          }
        }

        // Clean up response - remove special blocks
        let cleanResponse = fullResponse
          .replace(/\[AI_GENERATED_IMAGE\][\s\S]*?\[\/AI_GENERATED_IMAGE\]/g, "[Image generated]")
          .replace(/\[AI_IMAGE_PROMPT\][\s\S]*?\[\/AI_IMAGE_PROMPT\]/g, "")
          .replace(/\[IMAGE_GALLERY\][\s\S]*?\[\/IMAGE_GALLERY\]/g, "[Images found]")
          .replace(/\[WEATHER_DATA\][\s\S]*?\[\/WEATHER_DATA\]/g, "")
          .trim();

        // Remove processing line and add response
        setLines(prev => {
          const newLines = prev.filter(l => l.content !== "Processing...");
          return [...newLines, 
            { type: "system", content: "" },
            { type: "assistant", content: `> ${cleanResponse}` },
            { type: "system", content: "" }
          ];
        });
      }
    } catch (error) {
      console.error("CLI chat error:", error);
      setLines(prev => {
        const newLines = prev.filter(l => l.content !== "Processing...");
        return [...newLines, { type: "error", content: "Error: Failed to get response from Cloud." }, { type: "system", content: "" }];
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    handleCommand(input);
    setInput("");
  };

  return (
    <div className="fixed inset-0 bg-black z-[80] flex flex-col animate-fade-in font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-card/20 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <button 
              onClick={onClose}
              className="h-3 w-3 rounded-full bg-destructive hover:opacity-80 transition-opacity"
            />
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <span className="text-muted-foreground text-sm ml-2">cloud-cli — bash</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Terminal content */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "whitespace-pre-wrap",
              line.type === "user" && "text-primary",
              line.type === "assistant" && "text-green-400",
              line.type === "error" && "text-destructive",
              line.type === "system" && "text-muted-foreground"
            )}
          >
            {line.content}
          </div>
        ))}

        {/* Input line */}
        {bootComplete && (
          <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-1">
            <span className="text-primary">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
              placeholder={isTyping ? "Processing..." : "Type a message..."}
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-1 text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Blinking cursor when not typing */}
        {!bootComplete && (
          <span className="text-primary animate-pulse">▊</span>
        )}
      </div>

      {/* Status bar */}
      <div className="px-4 py-1 bg-card/20 border-t border-border/30 text-xs text-muted-foreground flex justify-between">
        <span>Cloud CLI v1.0.0</span>
        <span>{user ? `Logged in as ${profile?.username || user.email}` : "Guest mode"}</span>
      </div>
    </div>
  );
}