import { Colors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme-provider";
import { Appearance } from "react-native";

export function useThemeColor(
  props: { light?: string; dark?: string; sepia?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark & keyof typeof Colors.sepia
) {
  const { theme } = useAppTheme();

  // map "system" to actual theme
  const effectiveTheme =
    theme === "system" ? (Appearance.getColorScheme() === "dark" ? "dark" : "light") : theme;

  const colorFromProps = props[effectiveTheme];
  if (colorFromProps) return colorFromProps;

  return Colors[effectiveTheme][colorName];
}