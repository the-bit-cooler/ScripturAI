import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { ThemeName } from "@/constants/theme";

export function useColorScheme(): ThemeName {
  const [theme, setTheme] = useState<ThemeName>("light");

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("app-theme");
      if (stored === "system" || !stored) {
        const sys = (Appearance.getColorScheme() ?? "light") as ThemeName;
        setTheme(sys);
      } else {
        setTheme(stored as ThemeName);
      }
    })();
  }, []);

  return theme;
}