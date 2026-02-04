import { useState } from "react";
import { Key, Copy, Check, Trash2, RefreshCw, Eye, EyeOff, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useApiKey } from "@/hooks/useApiKey";
import { ApiDocsDialog } from "@/components/ApiDocsDialog";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ApiKeySection() {
  const { apiKey, isLoading, generateApiKey, revokeApiKey } = useApiKey();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await generateApiKey();
    setIsGenerating(false);
    setShowKey(true);
  };

  const handleRevoke = async () => {
    setIsRevoking(true);
    await revokeApiKey();
    setIsRevoking(false);
    setShowKey(false);
  };

  const copyKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey.api_key);
      setCopied(true);
      toast({
        title: "API key copied",
        description: "Your API key has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const maskedKey = apiKey 
    ? `${apiKey.api_key.slice(0, 10)}${'•'.repeat(20)}${apiKey.api_key.slice(-6)}`
    : "";

  const formattedDate = apiKey?.last_used_at 
    ? new Date(apiKey.last_used_at).toLocaleDateString()
    : "Never";

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          <Label className="font-medium">API Access</Label>
        </div>
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          <Label className="font-medium">API Access</Label>
        </div>
        <ApiDocsDialog 
          trigger={
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7">
              <FileText className="h-3.5 w-3.5" />
              Docs
            </Button>
          }
        />
      </div>

      {apiKey ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={showKey ? apiKey.api_key : maskedKey}
              className="font-mono text-xs bg-muted"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={copyKey}
              title="Copy key"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Last used: {formattedDate}</span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive gap-1.5 h-7"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your API key. Any applications using this key will stop working.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRevoke}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isRevoking}
                  >
                    {isRevoking ? "Revoking..." : "Revoke Key"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Generate an API key to programmatically add data to your Cloud feed.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Key className="h-4 w-4" />
                Generate API Key
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
