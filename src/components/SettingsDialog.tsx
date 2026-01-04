import { useState } from "react";
import { Settings, ChevronLeft, ChevronRight, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import luna1 from "@/assets/luna-1.jpg";
import luna2 from "@/assets/luna-2.jpg";
import luna3 from "@/assets/luna-3.jpg";

export type GenderPronouns = "he/him" | "she/her" | "they/them" | "prefer-not-to-say";

interface SettingsDialogProps {
  userName: string;
  onUserNameChange: (name: string) => void;
  userGender: GenderPronouns;
  onUserGenderChange: (gender: GenderPronouns) => void;
  webSearchEnabled: boolean;
  onWebSearchToggle: () => void;
  variant?: "header" | "sidebar";
}

const lunaImages = [luna1, luna2, luna3];

export function SettingsDialog({
  userName,
  onUserNameChange,
  userGender,
  onUserGenderChange,
  webSearchEnabled,
  onWebSearchToggle,
  variant = "header",
}: SettingsDialogProps) {
  const [showDogGallery, setShowDogGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { theme, toggleTheme } = useTheme();

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % lunaImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + lunaImages.length) % lunaImages.length);
  };

  const triggerButton = variant === "sidebar" ? (
    <button
      className="w-full flex items-center gap-3 rounded-lg bg-muted text-muted-foreground px-4 py-3 hover:bg-muted/80 transition-colors"
      title="Settings"
    >
      <Settings className="h-5 w-5" />
      <span className="font-medium">Settings</span>
    </button>
  ) : (
    <button
      className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      title="Settings"
    >
      <Settings className="h-5 w-5" />
    </button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name Setting */}
          <div className="space-y-2">
            <Label htmlFor="username">Name</Label>
            <Input
              id="username"
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              placeholder="User"
            />
            <p className="text-xs text-muted-foreground">Cloud will use this name when talking to you</p>
          </div>

          {/* Gender/Pronouns Setting */}
          <div className="space-y-2">
            <Label htmlFor="gender">Pronouns</Label>
            <Select value={userGender} onValueChange={(value) => onUserGenderChange(value as GenderPronouns)}>
              <SelectTrigger id="gender" className="w-full bg-background">
                <SelectValue placeholder="Select pronouns" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                <SelectItem value="he/him">He/Him</SelectItem>
                <SelectItem value="she/her">She/Her</SelectItem>
                <SelectItem value="they/them">They/Them</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Cloud will use your preferred pronouns</p>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="theme" className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Theme
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {theme === "dark" ? "Mocha" : "Latte"}
              </span>
              <Switch
                id="theme"
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
              />
            </div>
          </div>

          {/* Web Search Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="websearch">Web Search</Label>
            <Switch
              id="websearch"
              checked={webSearchEnabled}
              onCheckedChange={onWebSearchToggle}
            />
          </div>

          {showDogGallery && (
            <div className="animate-fade-in space-y-3">
              {/* Photo Frame */}
              <div className="relative mx-auto w-full max-w-xs">
                <div className="rounded-lg p-2 shadow-lg border-[sidebar-accent-foreground] border-sidebar-accent bg-secondary py-[10px] px-[10px]">
                  <div className="relative aspect-square overflow-hidden rounded bg-muted">
                    <img
                      src={lunaImages[currentImageIndex]}
                      alt={`Luna photo ${currentImageIndex + 1}`}
                      className="h-full w-full object-cover"
                    />

                    {/* Navigation arrows */}
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-background transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-background transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Caption area */}
                  <div className="mt-2 rounded px-3 py-2 text-center bg-accent">
                    <p className="text-sm font-medium text-primary-foreground">
                      My Dog Luna - Dev (Panagiotis)
                    </p>
                  </div>
                </div>
              </div>

              {/* Image indicators */}
              <div className="flex justify-center gap-2">
                {lunaImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      index === currentImageIndex
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dog Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setShowDogGallery((prev) => !prev)}
              className="rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/80 transition-colors"
              title="Luna"
            >
              🐕
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
