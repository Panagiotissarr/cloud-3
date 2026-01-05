import { useState, useEffect, useCallback } from "react";
import {
  ThemeConfig,
  ThemeMode,
  ThemePalette,
  CatppuccinAccent,
  defaultThemeConfig,
  catppuccinAccents,
} from "@/lib/themes";

const THEME_STORAGE_KEY = "theme-config";

function getSystemTheme(): "light" | "dark" {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function getEffectiveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return getSystemTheme();
  }
  return mode;
}

export function useTheme() {
  const [config, setConfig] = useState<ThemeConfig>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        return { ...defaultThemeConfig, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return defaultThemeConfig;
  });

  const effectiveMode = getEffectiveMode(config.mode);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;

    // Set dark/light mode
    if (effectiveMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Set palette
    root.setAttribute("data-palette", config.palette);

    // Apply Catppuccin accent colors
    if (config.palette === "catppuccin") {
      const accentColors = catppuccinAccents[config.catppuccinAccent];
      const accentColor = effectiveMode === "dark" ? accentColors.dark : accentColors.light;
      
      root.style.setProperty("--primary", accentColor);
      root.style.setProperty("--accent", accentColor);
      root.style.setProperty("--ring", accentColor);
      root.style.setProperty("--sidebar-primary", accentColor);
      root.style.setProperty("--sidebar-ring", accentColor);
    } else {
      // Remove inline styles for non-catppuccin themes
      root.style.removeProperty("--primary");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--sidebar-ring");
    }

    // Apply custom colors
    if (config.palette === "custom") {
      root.style.setProperty("--custom-primary", config.customColors.primary);
      root.style.setProperty("--custom-background", config.customColors.background);
      root.style.setProperty("--custom-foreground", config.customColors.foreground);
    } else {
      root.style.removeProperty("--custom-primary");
      root.style.removeProperty("--custom-background");
      root.style.removeProperty("--custom-foreground");
    }

    // Save to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
  }, [config, effectiveMode]);

  // Listen for system theme changes
  useEffect(() => {
    if (config.mode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // Force re-render by updating config
      setConfig((prev) => ({ ...prev }));
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [config.mode]);

  const setMode = useCallback((mode: ThemeMode) => {
    setConfig((prev) => ({ ...prev, mode }));
  }, []);

  const setPalette = useCallback((palette: ThemePalette) => {
    setConfig((prev) => ({ ...prev, palette }));
  }, []);

  const setAccent = useCallback((accent: CatppuccinAccent) => {
    setConfig((prev) => ({ ...prev, catppuccinAccent: accent }));
  }, []);

  const setCustomColors = useCallback((colors: Partial<ThemeConfig["customColors"]>) => {
    setConfig((prev) => ({
      ...prev,
      customColors: { ...prev.customColors, ...colors },
    }));
  }, []);

  // Legacy support
  const theme = effectiveMode;
  const toggleTheme = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      mode: getEffectiveMode(prev.mode) === "dark" ? "light" : "dark",
    }));
  }, []);

  return {
    // New API
    config,
    effectiveMode,
    setMode,
    setPalette,
    setAccent,
    setCustomColors,
    // Legacy API
    theme,
    setTheme: setMode,
    toggleTheme,
  };
}
