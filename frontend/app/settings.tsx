
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from 'expo-application';
import { useEffect, useState } from "react";
import { Alert, Button, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from "react-native";

import { AppTheme, useAppTheme } from "@/hooks/use-app-theme-provider";
import { useThemeColor } from "@/hooks/use-theme-color";

import { Colors } from "@/constants/theme";
import { UserPreferences } from "@/constants/user-preferences";
import { AiModes, AiModeValues } from "@/constants/ai-modes";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { HorizontalThemedSeparator } from "@/components/ui/themed-separator";

type AppearanceSectionProps = {
  appTheme: AppTheme;
  setAppTheme: (theme: AppTheme) => void
  color: string;
  selectedColor: string;
}

const AppearanceSection = ({ appTheme, setAppTheme, color, selectedColor }: AppearanceSectionProps) => {
  const themeOptions = ["light", "dark", "sepia", "system"] as const;

  return (
    <>
      <ThemedText type="subtitle" style={[styles.header, { color }]}>
        Appearance
      </ThemedText>
      {themeOptions.map((option) => {
        const isSelected = appTheme === option;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.optionButton, { borderColor: isSelected ? selectedColor : "transparent" }]}
            onPress={() => setAppTheme(option)}
          >
            <ThemedText style={{ color: isSelected ? selectedColor : color }}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </>
  );
};

type AiModeSectionProps = {
  color: string;
  selectedColor: string;
}

const AiModeSection = ({ color, selectedColor }: AiModeSectionProps) => {
  const [mode, setMode] = useState(AiModes.devotional);
  const [allowThinkingSound, setAllowThinkingSound] = useState(true);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(UserPreferences.ai_mode);
        if (storedMode) {
          setMode(storedMode);
        }
        const storedThinkingSound = await AsyncStorage.getItem(UserPreferences.ai_thinking_sound);
        if (storedThinkingSound === "false") {
          setAllowThinkingSound(false);
        }
      } catch (err) {
        console.error('Error loading AI mode preference:', err);
      }
    };

    loadPreference();
  }, [mode, allowThinkingSound]);

  return (
    <View style={{ marginTop: 10 }}>
      <ThemedText type="subtitle" style={[styles.header, { color }]}>
        AI Mode
      </ThemedText>
      {AiModeValues.map((option) => {
        const isSelected = mode === option;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.optionButton, { borderColor: isSelected ? selectedColor : "transparent" }]}
            onPress={async () => {
              try {
                await AsyncStorage.setItem(UserPreferences.ai_mode, option);
                setMode(option);
              } catch (err) {
                Alert.alert("Error", "Something went wrong! Pleas try again later.");
                console.error('Error storing AI mode preference: ', err);
              }
            }}
          >
            <ThemedText style={{ color: isSelected ? selectedColor : color }}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
      <View style={styles.soundToggleContainer}>
        <ThemedText style={styles.soundToggleLabel}>Enable Thinking Sound</ThemedText>
        <Switch
          value={allowThinkingSound}
          onValueChange={async (value) => {
            try {
              await AsyncStorage.setItem(UserPreferences.ai_thinking_sound, value ? "true" : "false");
              setAllowThinkingSound(value);
            } catch (err) {
              console.warn("Error saving thinking sound preference", err);
            }
          }}
          // trackColor={{ false: "#81b0ff", true: "#81b0ff" }}
          // thumbColor={allowThinkingSound ? "" : "red"}
        />
      </View>
    </View>
  );
};

export default function SettingsScreen() {
  const { theme, setTheme } = useAppTheme();
  const backgroundColor = useThemeColor({}, "cardBackground")
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");


  const clearStorage = async () => {
    Alert.alert(
      "Clear App Data",
      "Are you sure you want to clear all app data? \n\n This will remove all downloaded bible books and other related content. \n\nThis will also reset your theme and other preferences.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert("Cleared", "All app data has been cleared.");
              setTheme("system"); // reset theme to system default
            } catch (err) {
              Alert.alert("Error", "Something went wrong! Pleas try again later.");
              console.error('Error clearing app data: ', err);
            }
          },
        },
      ]
    );
  };

  const showAbout = () => {
    Alert.alert(
      `About ${Application.applicationName}`,
      `App Version ${Application.nativeApplicationVersion}\nBuild Number ${Application.nativeBuildVersion}\n© 2025 The Bit Cooler\n\nIn ❤️❤️ memory of Charlie Kirk`
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <AppearanceSection
          appTheme={theme}
          setAppTheme={setTheme}
          color={textColor}
          selectedColor={tintColor}
        />
        <HorizontalThemedSeparator />
        <AiModeSection
          color={textColor}
          selectedColor={tintColor}
        />
        <HorizontalThemedSeparator />
        <View style={{ marginTop: 10 }}>
          <Button title="Clear App Data" color={Colors.error.text} onPress={clearStorage} />
        </View>
        <View style={{ marginTop: 20 }}>
          <Button title="About" onPress={showAbout} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 8,
    marginVertical: 6,
  },
  soundToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  soundToggleLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
});