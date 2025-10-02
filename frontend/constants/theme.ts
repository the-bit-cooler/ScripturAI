import { Platform } from "react-native";

export type ThemeName = "light" | "dark" | "sepia";

const tintSepia = "#8B5E3C";

export const Colors: Record<ThemeName, any> = {
  light: {
    text: "#222222",              // Main scripture text
    background: "#FAF9F6",        // Page background
    verseBackground: "#FAF9F6",   // Individual verse background
    cardBackground: "#F5F0E6",    // Headers, tab bars, panels
    tint: "#3B82F6",              // Action colors, links, highlights
    icon: "#687076",              // Icons
    tabIconDefault: "#687076",    // Unselected tab icon
    tabIconSelected: "#3B82F6",   // Selected tab icon
    verseNumber: "#7C83FD",       // Verse numbers
  },
  dark: {
    text: "#ECEDEE",              // Main scripture text
    background: "#151718",        // Page background
    verseBackground: "#1E1E1E",   // Individual verse background
    cardBackground: "#212121",    // Headers, tab bars, panels
    tint: "#60A5FA",              // Action colors, links, highlights
    icon: "#9BA1A6",              // Icons
    tabIconDefault: "#9BA1A6",    // Unselected tab icon
    tabIconSelected: "#60A5FA",   // Selected tab icon
    verseNumber: "#A0A7FF",       // Verse numbers
  },
  sepia: {
    text: "#3E2F1C",              // Main scripture text
    background: "#F4ECD8",        // Page background
    verseBackground: "#EFE2C6",   // Individual verse background
    cardBackground: "#E8D9B5",    // Headers, tab bars, panels
    tint: "#8B5E3C",              // Action colors, links, highlights
    icon: "#8B5E3C",              // Icons
    tabIconDefault: "#8B5E3C",    // Unselected tab icon
    tabIconSelected: "#8B5E3C",   // Selected tab icon
    verseNumber: "#C47F3B",       // Verse numbers
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
