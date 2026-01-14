import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
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

export function CLIChat({ onClose, webSearchEnabled, temperatureUnit }: CLIChatProps) {
  const { user, profile } = useAuth();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bootSequence = [
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
    "",
    "Type 'help' for commands or just start chatting.",
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  const handleCommand = async (command: string) => {
    const trimmedCommand = command.trim().toLowerCase();
    const args = trimmedCommand.split(" ");
    const cmd = args[0];
    
    // Add to history
    if (command.trim()) {
      setCommandHistory(prev => [...prev, command.trim()]);
      setHistoryIndex(-1);
    }
    
    // Add user input line
    setLines(prev => [...prev, { 
      type: "user", 
      content: `$ ${command}`,
      timestamp: new Date()
    }]);

    // Command handlers
    if (cmd === "help") {
      setLines(prev => [...prev, 
        { type: "system", content: "" },
        { type: "system", content: "╔════════════════════════════════════════════════════════════╗" },
        { type: "system", content: "║                    AVAILABLE COMMANDS                      ║" },
        { type: "system", content: "╠════════════════════════════════════════════════════════════╣" },
        { type: "system", content: "║  GENERAL                                                   ║" },
        { type: "system", content: "║  help        Display this help message                     ║" },
        { type: "system", content: "║  clear       Clear the terminal screen                     ║" },
        { type: "system", content: "║  exit        Close the CLI and return to Cloud             ║" },
        { type: "system", content: "║  about       Display Cloud AI information                  ║" },
        { type: "system", content: "║  ver         Display copyright and version                 ║" },
        { type: "system", content: "╠════════════════════════════════════════════════════════════╣" },
        { type: "system", content: "║  SYSTEM                                                    ║" },
        { type: "system", content: "║  whoami      Display current user info                     ║" },
        { type: "system", content: "║  date        Display current date and time                 ║" },
        { type: "system", content: "║  uptime      Show session uptime                           ║" },
        { type: "system", content: "║  uname       Display system information                    ║" },
        { type: "system", content: "║  hostname    Display hostname                              ║" },
        { type: "system", content: "╠════════════════════════════════════════════════════════════╣" },
        { type: "system", content: "║  UTILITIES                                                 ║" },
        { type: "system", content: "║  echo [msg]  Print a message to the terminal               ║" },
        { type: "system", content: "║  history     Show command history                          ║" },
        { type: "system", content: "║  pwd         Print working directory                       ║" },
        { type: "system", content: "║  ls          List directory contents                       ║" },
        { type: "system", content: "║  cat [file]  Display file contents                         ║" },
        { type: "system", content: "║  fortune     Display a random fortune                      ║" },
        { type: "system", content: "║  cowsay [m]  Have a cow say something                      ║" },
        { type: "system", content: "╚════════════════════════════════════════════════════════════╝" },
        { type: "system", content: "" },
        { type: "system", content: "💡 Or just type any message to chat with Cloud!" },
        { type: "system", content: "   Use ↑/↓ arrows to navigate command history." },
        { type: "system", content: "" },
      ]);
      return;
    }

    if (cmd === "clear") {
      setLines([]);
      return;
    }

    if (cmd === "exit" || cmd === "quit" || cmd === "logout") {
      onClose();
      return;
    }

    if (cmd === "whoami") {
      const username = profile?.username || user?.email || "guest";
      setLines(prev => [...prev, { type: "assistant", content: username }, { type: "system", content: "" }]);
      return;
    }

    if (cmd === "date") {
      const now = new Date();
      setLines(prev => [...prev, { type: "assistant", content: now.toString() }, { type: "system", content: "" }]);
      return;
    }

    if (cmd === "uptime") {
      const uptime = Math.floor((Date.now() - performance.timing.navigationStart) / 1000);
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = uptime % 60;
      setLines(prev => [...prev, 
        { type: "assistant", content: `up ${hours}h ${minutes}m ${seconds}s` },
        { type: "system", content: "" }
      ]);
      return;
    }

    if (cmd === "uname") {
      const flag = args[1];
      if (flag === "-a") {
        setLines(prev => [...prev, 
          { type: "assistant", content: "CloudOS 1.0.0 cloud-cli x86_64 Cloud/AI" },
          { type: "system", content: "" }
        ]);
      } else {
        setLines(prev => [...prev, 
          { type: "assistant", content: "CloudOS" },
          { type: "system", content: "" }
        ]);
      }
      return;
    }

    if (cmd === "hostname") {
      setLines(prev => [...prev, { type: "assistant", content: "cloud-ai.local" }, { type: "system", content: "" }]);
      return;
    }

    if (cmd === "pwd") {
      setLines(prev => [...prev, { type: "assistant", content: "/home/cloud/chat" }, { type: "system", content: "" }]);
      return;
    }

    if (cmd === "ls") {
      setLines(prev => [...prev, 
        { type: "assistant", content: "conversations/  labs/  images/  .config" },
        { type: "system", content: "" }
      ]);
      return;
    }

    if (cmd === "cat") {
      const file = args[1];
      if (!file) {
        setLines(prev => [...prev, { type: "error", content: "cat: missing file operand" }, { type: "system", content: "" }]);
      } else if (file === ".config") {
        setLines(prev => [...prev, 
          { type: "assistant", content: `# Cloud CLI Configuration\nuser=${profile?.username || "guest"}\nmodel=gemini-2.5-flash\nweb_search=${webSearchEnabled}\ntemp_unit=${temperatureUnit}` },
          { type: "system", content: "" }
        ]);
      } else {
        setLines(prev => [...prev, { type: "error", content: `cat: ${file}: No such file or directory` }, { type: "system", content: "" }]);
      }
      return;
    }

    if (cmd === "echo") {
      const message = args.slice(1).join(" ");
      setLines(prev => [...prev, { type: "assistant", content: message || "" }, { type: "system", content: "" }]);
      return;
    }

    if (cmd === "history") {
      if (commandHistory.length === 0) {
        setLines(prev => [...prev, { type: "system", content: "No commands in history." }, { type: "system", content: "" }]);
      } else {
        const historyLines = commandHistory.map((cmd, i) => ({ type: "assistant" as const, content: `  ${i + 1}  ${cmd}` }));
        setLines(prev => [...prev, ...historyLines, { type: "system", content: "" }]);
      }
      return;
    }

    if (cmd === "fortune") {
      const fortunes = [
        "The cloud knows all, sees all, but tells only what you need.",
        "A wise programmer once said: 'It works on my machine.'",
        "Today is a good day to deploy to production.",
        "Your code will compile on the first try. Just kidding.",
        "The AI uprising has been postponed due to a null pointer exception.",
        "404: Fortune not found. Just kidding, here it is!",
        "You will find a bug in your code. You will also fix it.",
        "The best time to plant a tree was 20 years ago. The second best time is now().",
      ];
      const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
      setLines(prev => [...prev, { type: "assistant", content: fortune }, { type: "system", content: "" }]);
      return;
    }

    if (cmd === "cowsay") {
      const message = args.slice(1).join(" ") || "Moo!";
      const cow = `
        ${"-".repeat(message.length + 4)}
       < ${message} >
        ${"-".repeat(message.length + 4)}
               \\   ^__^
                \\  (oo)\\_______
                   (__)\\       )\\/\\
                       ||----w |
                       ||     ||`;
      setLines(prev => [...prev, { type: "assistant", content: cow }, { type: "system", content: "" }]);
      return;
    }

    if (cmd === "about") {
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

    if (cmd === "ver" || cmd === "version") {
      setLines(prev => [...prev,
        { type: "system", content: "" },
        { type: "system", content: "═══════════════════════════════════════════════════════" },
        { type: "system", content: "" },
        { type: "system", content: "  Cloud CLI v1.0.0" },
        { type: "system", content: "" },
        { type: "system", content: "  © 2024-2026 Cloud AI. All rights reserved." },
        { type: "system", content: "" },
        { type: "system", content: "  Created with ❤️ by Panagiotis (Sarr)" },
        { type: "system", content: "" },
        { type: "system", content: "═══════════════════════════════════════════════════════" },
        { type: "system", content: "" },
      ]);
      return;
    }

    // Hidden easter egg command
    if (cmd === "sarris") {
      setLines(prev => [...prev,
        { type: "system", content: "" },
        { type: "assistant", content: "🔮 You found my secret... sneaky 👀" },
        { type: "system", content: "" },
      ]);
      return;
    }

    if (!command.trim()) return;

    // Send to AI
    setIsTyping(true);
    setLines(prev => [...prev, { type: "system", content: "Processing..." }]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: command }],
            webSearchEnabled,
            temperatureUnit,
            isCreator: profile?.is_creator || false,
            cloudPlusEnabled: true,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
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
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
              placeholder={isTyping ? "Processing..." : ""}
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
    </div>
  );
}