import { useState } from "react";
import { Settings, ChevronLeft, ChevronRight, Monitor, Sun, Moon, Palette, Thermometer, Sparkles } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ThemeMode,
  ThemePalette,
  CatppuccinAccent,
  paletteDisplayNames,
  modeDisplayNames,
  accentDisplayNames,
  catppuccinAccents,
} from "@/lib/themes";
import luna1 from "@/assets/luna-1.jpg";
import luna2 from "@/assets/luna-2.jpg";
import luna3 from "@/assets/luna-3.jpg";

export type GenderPronouns = "he/him" | "she/her" | "they/them" | "prefer-not-to-say";
export type TemperatureUnit = "celsius" | "fahrenheit";

interface SettingsDialogProps {
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
  temperatureUnit,
  onTemperatureUnitChange,
  cloudPlusEnabled,
  onCloudPlusToggle,
  variant = "header",
}: SettingsDialogProps) {
  const [showDogGallery, setShowDogGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { config, setMode, setPalette, setAccent, setCustomColors, effectiveMode } = useTheme();

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % lunaImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + lunaImages.length) % lunaImages.length);
  };

  const modeIcon = config.mode === "system" ? Monitor : config.mode === "dark" ? Moon : Sun;
  const ModeIcon = modeIcon;

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
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
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

          {/* Theme Section */}
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <span className="font-medium">Appearance</span>
            </div>

            {/* Mode Selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ModeIcon className="h-4 w-4" />
                Mode
              </Label>
              <Select value={config.mode} onValueChange={(value) => setMode(value as ThemeMode)}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {(Object.keys(modeDisplayNames) as ThemeMode[]).map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {modeDisplayNames[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Palette Selector */}
            <div className="space-y-2">
              <Label>Color Palette</Label>
              <Select value={config.palette} onValueChange={(value) => setPalette(value as ThemePalette)}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {(Object.keys(paletteDisplayNames) as ThemePalette[]).map((palette) => (
                    <SelectItem key={palette} value={palette}>
                      {paletteDisplayNames[palette]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Catppuccin Accent Color */}
            {config.palette === "catppuccin" && (
              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(catppuccinAccents) as CatppuccinAccent[]).map((accent) => {
                    const colors = catppuccinAccents[accent];
                    const color = effectiveMode === "dark" ? colors.dark : colors.light;
                    const isSelected = config.catppuccinAccent === accent;
                    
                    return (
                      <button
                        key={accent}
                        onClick={() => setAccent(accent)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: `hsl(${color})` }}
                        />
                        <span className="text-xs">{accentDisplayNames[accent]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Colors */}
            {config.palette === "custom" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="custom-primary">Primary Color (HSL)</Label>
                  <Input
                    id="custom-primary"
                    value={config.customColors.primary}
                    onChange={(e) => setCustomColors({ primary: e.target.value })}
                    placeholder="266 85% 58%"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-bg">Background (HSL)</Label>
                  <Input
                    id="custom-bg"
                    value={config.customColors.background}
                    onChange={(e) => setCustomColors({ background: e.target.value })}
                    placeholder="240 21% 15%"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-fg">Foreground (HSL)</Label>
                  <Input
                    id="custom-fg"
                    value={config.customColors.foreground}
                    onChange={(e) => setCustomColors({ foreground: e.target.value })}
                    placeholder="226 64% 88%"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter colors in HSL format without hsl() wrapper, e.g., "266 85% 58%"
                </p>
              </div>
            )}
          </div>

          {/* Temperature Unit */}
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-primary" />
              Temperature Unit
            </Label>
            <Select value={temperatureUnit} onValueChange={(value) => onTemperatureUnitChange(value as TemperatureUnit)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                <SelectItem value="celsius">Celsius (°C)</SelectItem>
                <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Cloud will display temperatures in your preferred unit</p>
          </div>

          {/* Web Search Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Label htmlFor="websearch">Web Search</Label>
            <Switch
              id="websearch"
              checked={webSearchEnabled}
              onCheckedChange={onWebSearchToggle}
            />
          </div>

          {/* Cloud+ Toggle */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <Label htmlFor="cloudplus" className="font-medium">Cloud+</Label>
              </div>
              <Switch
                id="cloudplus"
                checked={cloudPlusEnabled}
                onCheckedChange={onCloudPlusToggle}
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground/80">Cloud+ includes:</p>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                <li>Google Image Search</li>
                <li>AI Image Generation</li>
                <li>Cloud Labs (Custom Knowledge)</li>
                <li>Cloud Colab (Group Chat)</li>
              </ul>
            </div>
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
