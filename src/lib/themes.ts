// Theme configuration with all color palettes
// All colors are in HSL format (without hsl() wrapper)

export type ThemeMode = "system" | "light" | "dark";
export type ThemePalette = "catppuccin" | "nord" | "rose" | "dracula" | "custom";
export type CatppuccinAccent = "mauve" | "pink" | "red" | "peach" | "yellow" | "green" | "teal" | "blue" | "lavender";

export interface ThemeConfig {
  mode: ThemeMode;
  palette: ThemePalette;
  catppuccinAccent: CatppuccinAccent;
  customColors: {
    primary: string;
    background: string;
    foreground: string;
  };
}

export const defaultThemeConfig: ThemeConfig = {
  mode: "system",
  palette: "catppuccin",
  catppuccinAccent: "mauve",
  customColors: {
    primary: "266 85% 58%",
    background: "240 21% 15%",
    foreground: "226 64% 88%",
  },
};

// Catppuccin accent colors for Latte (light) and Mocha (dark)
export const catppuccinAccents: Record<CatppuccinAccent, { light: string; dark: string }> = {
  mauve: { light: "266 85% 58%", dark: "267 84% 81%" },
  pink: { light: "346 76% 65%", dark: "316 72% 86%" },
  red: { light: "343 81% 53%", dark: "343 81% 75%" },
  peach: { light: "22 99% 52%", dark: "23 92% 75%" },
  yellow: { light: "35 77% 49%", dark: "41 86% 83%" },
  green: { light: "109 58% 40%", dark: "115 54% 76%" },
  teal: { light: "183 74% 35%", dark: "170 57% 73%" },
  blue: { light: "220 91% 54%", dark: "217 92% 76%" },
  lavender: { light: "231 97% 72%", dark: "232 97% 85%" },
};

export const accentDisplayNames: Record<CatppuccinAccent, string> = {
  mauve: "Mauve",
  pink: "Pink",
  red: "Red",
  peach: "Peach",
  yellow: "Yellow",
  green: "Green",
  teal: "Teal",
  blue: "Blue",
  lavender: "Lavender",
};

export const paletteDisplayNames: Record<ThemePalette, string> = {
  catppuccin: "Catppuccin",
  nord: "Nord",
  rose: "Rosé Pine",
  dracula: "Dracula",
  custom: "Custom",
};

export const modeDisplayNames: Record<ThemeMode, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};
