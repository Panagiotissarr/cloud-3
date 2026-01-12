import { useState } from "react";
import { X, Trash2, Download, Sparkles, Loader2 } from "lucide-react";
import { useAIGallery, AIGeneratedImage } from "@/hooks/useAIGallery";
import { cn } from "@/lib/utils";

interface AIGalleryProps {
  onClose: () => void;
}

export function AIGallery({ onClose }: AIGalleryProps) {
  const { images, isLoading, deleteImage } = useAIGallery();
  const [selectedImage, setSelectedImage] = useState<AIGeneratedImage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(imageId);
    await deleteImage(imageId);
    setDeletingId(null);
    if (selectedImage?.id === imageId) {
      setSelectedImage(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">AI Gallery</h2>
          <span className="text-xs text-muted-foreground">({images.length} images)</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No images saved yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Generate images in chat and save them to your gallery
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                onClick={() => setSelectedImage(image)}
                className={cn(
                  "group relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-muted transition-all hover:ring-2 hover:ring-primary/50",
                  selectedImage?.id === image.id && "ring-2 ring-primary"
                )}
              >
                <img
                  src={image.image_url}
                  alt={image.prompt}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-xs truncate">{image.prompt}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(image.id, e)}
                  disabled={deletingId === image.id}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                >
                  {deletingId === image.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Detail Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-background/90 z-[70] flex items-center justify-center animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl w-full mx-4 bg-secondary rounded-2xl overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 text-foreground hover:bg-background transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col md:flex-row">
              <div className="flex-1 bg-muted">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.prompt}
                  className="w-full h-64 md:h-96 object-contain"
                />
              </div>

              <div className="p-6 md:w-72 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Prompt</h3>
                  <p className="text-foreground text-sm">{selectedImage.prompt}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                  <p className="text-foreground text-sm">{formatDate(selectedImage.created_at)}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <a
                    href={selectedImage.image_url}
                    download={`ai-image-${selectedImage.id}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-sm">Download</span>
                  </a>
                  <button
                    onClick={(e) => handleDelete(selectedImage.id, e)}
                    disabled={deletingId === selectedImage.id}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                  >
                    {deletingId === selectedImage.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
