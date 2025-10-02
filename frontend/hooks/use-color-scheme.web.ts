import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeName } from "@/constants/theme";

export function useColorScheme(): ThemeName {
  const [theme, setTheme] = useState<ThemeName>("light");
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("app-theme");
      if (!stored || stored === "system") {
        const sys = useRNColorScheme() ?? "light";
        setTheme(sys as ThemeName);
      } else {
        setTheme(stored as ThemeName);
      }
      setHasHydrated(true);
    })();
  }, []);

  // During SSR or pre-hydration, return 'light'
  if (!hasHydrated) return "light";

  return theme;
}