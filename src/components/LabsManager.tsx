import { useState, useEffect } from "react";
import { FlaskConical, Plus, Trash2, FileText, Globe, Type, ChevronRight, X, Edit2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLabs, Lab, LabContent } from "@/hooks/useLabs";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface LabsManagerProps {
  onClose?: () => void;
}

export function LabsManager({ onClose }: LabsManagerProps) {
  const { user } = useAuth();
  const { labs, createLab, deleteLab, updateLab, getLabContent, addLabContent, deleteLabContent } = useLabs();
  const { toast } = useToast();
  
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [labContents, setLabContents] = useState<LabContent[]>([]);
  const [isCreatingLab, setIsCreatingLab] = useState(false);
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [editingLabId, setEditingLabId] = useState<string | null>(null);
  
  // New lab form
  const [newLabName, setNewLabName] = useState("");
  const [newLabDescription, setNewLabDescription] = useState("");
  const [editLabName, setEditLabName] = useState("");
  
  // New content form
  const [contentType, setContentType] = useState<"webpage" | "text" | "markdown">("text");
  const [contentTitle, setContentTitle] = useState("");
  const [contentBody, setContentBody] = useState("");
  const [contentUrl, setContentUrl] = useState("");

  useEffect(() => {
    if (selectedLab) {
      loadLabContents(selectedLab.id);
    }
  }, [selectedLab]);

  const loadLabContents = async (labId: string) => {
    const contents = await getLabContent(labId);
    setLabContents(contents);
  };

  const handleCreateLab = async () => {
    if (!newLabName.trim()) {
      toast({ title: "Error", description: "Lab name is required", variant: "destructive" });
      return;
    }

    const lab = await createLab(newLabName.trim(), newLabDescription.trim());
    if (lab) {
      toast({ title: "Lab created", description: `"${lab.name}" has been created` });
      setNewLabName("");
      setNewLabDescription("");
      setIsCreatingLab(false);
    }
  };

  const handleDeleteLab = async (lab: Lab) => {
    const success = await deleteLab(lab.id);
    if (success) {
      toast({ title: "Lab deleted", description: `"${lab.name}" has been deleted` });
      if (selectedLab?.id === lab.id) {
        setSelectedLab(null);
        setLabContents([]);
      }
    }
  };

  const handleEditLab = async (labId: string) => {
    if (!editLabName.trim()) return;
    
    const success = await updateLab(labId, { name: editLabName.trim() });
    if (success) {
      toast({ title: "Lab updated" });
      setEditingLabId(null);
      setEditLabName("");
    }
  };

  const handleAddContent = async () => {
    if (!selectedLab || !contentTitle.trim() || !contentBody.trim()) {
      toast({ title: "Error", description: "Title and content are required", variant: "destructive" });
      return;
    }

    const content = await addLabContent(
      selectedLab.id,
      contentType,
      contentTitle.trim(),
      contentBody.trim(),
      contentType === "webpage" ? contentUrl.trim() : undefined
    );

    if (content) {
      toast({ title: "Content added", description: `"${content.title}" has been added` });
      setLabContents((prev) => [content, ...prev]);
      setContentTitle("");
      setContentBody("");
      setContentUrl("");
      setIsAddingContent(false);
    }
  };

  const handleDeleteContent = async (content: LabContent) => {
    const success = await deleteLabContent(content.id);
    if (success) {
      toast({ title: "Content deleted" });
      setLabContents((prev) => prev.filter((c) => c.id !== content.id));
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "webpage":
        return <Globe className="h-4 w-4" />;
      case "markdown":
        return <FileText className="h-4 w-4" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center">
        <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Sign in to use Cloud Labs</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Cloud Labs</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Labs List */}
        <div className="w-1/3 border-r border-border overflow-y-auto">
          <div className="p-3">
            <Button
              onClick={() => setIsCreatingLab(true)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Lab
            </Button>
          </div>

          {/* Create Lab Form */}
          {isCreatingLab && (
            <div className="p-3 border-b border-border bg-muted/50">
              <Input
                placeholder="Lab name"
                value={newLabName}
                onChange={(e) => setNewLabName(e.target.value)}
                className="mb-2"
              />
              <Input
                placeholder="Description (optional)"
                value={newLabDescription}
                onChange={(e) => setNewLabDescription(e.target.value)}
                className="mb-2"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateLab}>Create</Button>
                <Button size="sm" variant="outline" onClick={() => setIsCreatingLab(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Labs */}
          <div className="p-2 space-y-1">
            {labs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No labs yet</p>
            ) : (
              labs.map((lab) => (
                <div
                  key={lab.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors group",
                    selectedLab?.id === lab.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  {editingLabId === lab.id ? (
                    <div className="flex-1 flex items-center gap-1">
                      <Input
                        value={editLabName}
                        onChange={(e) => setEditLabName(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditLab(lab.id);
                          if (e.key === "Escape") setEditingLabId(null);
                        }}
                      />
                      <button
                        onClick={() => handleEditLab(lab.id)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setSelectedLab(lab)}
                        className="flex-1 text-left flex items-center gap-2"
                      >
                        <FlaskConical className="h-4 w-4 shrink-0" />
                        <span className="text-sm truncate">{lab.name}</span>
                      </button>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingLabId(lab.id);
                            setEditLabName(lab.name);
                          }}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Edit2 className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDeleteLab(lab)}
                          className="p-1 hover:bg-destructive/20 rounded"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lab Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedLab ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-foreground">{selectedLab.name}</h3>
                  {selectedLab.description && (
                    <p className="text-sm text-muted-foreground">{selectedLab.description}</p>
                  )}
                </div>
                <Button
                  onClick={() => setIsAddingContent(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Content
                </Button>
              </div>

              {/* Add Content Form */}
              {isAddingContent && (
                <div className="p-4 border border-border rounded-lg bg-muted/50 mb-4">
                  <div className="space-y-3">
                    <Select value={contentType} onValueChange={(v: "webpage" | "text" | "markdown") => setContentType(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Content type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Plain Text</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                        <SelectItem value="webpage">Webpage</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Title"
                      value={contentTitle}
                      onChange={(e) => setContentTitle(e.target.value)}
                    />

                    {contentType === "webpage" && (
                      <Input
                        placeholder="URL (optional)"
                        value={contentUrl}
                        onChange={(e) => setContentUrl(e.target.value)}
                      />
                    )}

                    <Textarea
                      placeholder={contentType === "webpage" ? "Paste webpage content here..." : "Enter your content..."}
                      value={contentBody}
                      onChange={(e) => setContentBody(e.target.value)}
                      rows={6}
                    />

                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddContent}>Add</Button>
                      <Button size="sm" variant="outline" onClick={() => setIsAddingContent(false)}>Cancel</Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Content List */}
              <div className="space-y-2">
                {labContents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No content yet. Add webpages, text, or markdown documents.
                  </p>
                ) : (
                  labContents.map((content) => (
                    <div
                      key={content.id}
                      className="flex items-start gap-3 p-3 border border-border rounded-lg group hover:bg-muted/50 transition-colors"
                    >
                      <div className="mt-0.5 text-muted-foreground">
                        {getTypeIcon(content.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-foreground truncate">{content.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {content.type.charAt(0).toUpperCase() + content.type.slice(1)}
                          {content.url && ` • ${content.url}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {content.content.slice(0, 150)}...
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteContent(content)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 rounded transition-opacity"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a lab to view its content</p>
              <p className="text-sm text-muted-foreground mt-1">
                Labs let you add context that Cloud can reference during chats
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
