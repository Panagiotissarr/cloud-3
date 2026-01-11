import { useState } from "react";
import { Users, Plus, ArrowRight, Trash2, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useColab, ColabSession } from "@/hooks/useColab";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ColabChat } from "./ColabChat";
import { GenderPronouns, TemperatureUnit } from "./SettingsDialog";

interface ColabManagerProps {
  onClose?: () => void;
  webSearchEnabled: boolean;
  temperatureUnit: TemperatureUnit;
}

export function ColabManager({ onClose, webSearchEnabled, temperatureUnit }: ColabManagerProps) {
  const { user } = useAuth();
  const { 
    sessions, 
    currentSession, 
    createSession, 
    joinSession, 
    enterSession, 
    leaveSessionView,
    deleteSession,
    isLoading 
  } = useColab();
  const { toast } = useToast();
  
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCreate = async () => {
    const session = await createSession(newSessionName.trim() || undefined);
    if (session) {
      toast({ 
        title: "Colab created!", 
        description: `Share code "${session.code}" with others.` 
      });
      setNewSessionName("");
      setShowCreate(false);
      enterSession(session);
    } else {
      toast({ title: "Error", description: "Failed to create colab", variant: "destructive" });
    }
  };

  const handleJoin = async () => {
    if (joinCode.length !== 5) {
      toast({ title: "Invalid code", description: "Please enter a 5-character code", variant: "destructive" });
      return;
    }
    
    const session = await joinSession(joinCode);
    if (session) {
      toast({ title: "Joined!", description: `You joined "${session.name}"` });
      setJoinCode("");
      setShowJoin(false);
      enterSession(session);
    } else {
      toast({ title: "Not found", description: "No colab found with that code", variant: "destructive" });
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Code copied!" });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDelete = async (session: ColabSession) => {
    const success = await deleteSession(session.id);
    if (success) {
      toast({ title: "Colab deleted" });
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Sign in to use Cloud Colab</p>
      </div>
    );
  }

  // If in a session, show the chat
  if (currentSession) {
    return (
      <ColabChat
        session={currentSession}
        onBack={leaveSessionView}
        webSearchEnabled={webSearchEnabled}
        temperatureUnit={temperatureUnit}
      />
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Cloud Colab</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3">
        {!showCreate && !showJoin && (
          <div className="flex gap-2">
            <Button onClick={() => setShowCreate(true)} className="flex-1 gap-2">
              <Plus className="h-4 w-4" />
              Create Colab
            </Button>
            <Button onClick={() => setShowJoin(true)} variant="outline" className="flex-1 gap-2">
              <ArrowRight className="h-4 w-4" />
              Join Colab
            </Button>
          </div>
        )}

        {/* Create Form */}
        {showCreate && (
          <div className="p-4 border border-border rounded-lg bg-muted/50 space-y-3">
            <Input
              placeholder="Session name (optional)"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={isLoading}>
                {isLoading ? "Creating..." : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Join Form */}
        {showJoin && (
          <div className="p-4 border border-border rounded-lg bg-muted/50 space-y-3">
            <Input
              placeholder="Enter 5-character code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
              className="font-mono text-center text-lg tracking-widest"
              maxLength={5}
            />
            <div className="flex gap-2">
              <Button onClick={handleJoin} disabled={isLoading || joinCode.length !== 5}>
                {isLoading ? "Joining..." : "Join"}
              </Button>
              <Button variant="outline" onClick={() => setShowJoin(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Your Colabs
        </h3>
        
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No colabs yet. Create one or join with a code!
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <button
                  onClick={() => enterSession(session)}
                  className="flex-1 text-left"
                >
                  <p className="font-medium text-foreground">{session.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Code: <span className="font-mono">{session.code}</span>
                  </p>
                </button>
                
                <button
                  onClick={() => handleCopyCode(session.code)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Copy code"
                >
                  {copiedCode === session.code ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                
                {session.created_by === user?.id && (
                  <button
                    onClick={() => handleDelete(session)}
                    className="p-2 hover:bg-destructive/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete colab"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
