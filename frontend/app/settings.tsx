import { View, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, Appearance, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

import { useAppTheme } from "@/hooks/use-app-theme-provider";

import { Colors } from "@/constants/theme";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";

const themeOptions = ["light", "dark", "sepia", "system"] as const;

export default function SettingsScreen() {
  const { theme, setTheme } = useAppTheme();
  const version = Constants.expoConfig?.version ?? "N/A";

  // iOS uses buildNumber, Android uses versionCode
  const buildIdentifier =
    Platform.OS === "ios"
      ? `Build Number ${Constants.expoConfig?.ios?.buildNumber ?? "N/A"}`
      : `Version Code ${Constants.expoConfig?.android?.versionCode ?? "N/A"}`;

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
            await AsyncStorage.clear();
            Alert.alert("Cleared", "All app data has been cleared.");
            setTheme("system"); // reset theme to system default
          },
        },
      ]
    );
  };

  const showAbout = () => {
    Alert.alert(
      "About ScripturAI",
      `Built with Expo + React Native\nApp Version ${version}\n${buildIdentifier}\n© 2025 The Bit Cooler\n\nIn ❤️❤️ memory of Charlie Kirk`
    );
  };

  // Compute effective theme for color lookup
  const effectiveTheme =
    theme === "system"
      ? Appearance.getColorScheme() === "dark"
        ? "dark"
        : "light"
      : theme;

  const backgroundColor = Colors[effectiveTheme].cardBackground;
  const textColor = Colors[effectiveTheme].text;
  const selectedColor = Colors[effectiveTheme].tint;

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText type="subtitle" style={[styles.header, { color: textColor }]}>
          Appearance
        </ThemedText>

        {themeOptions.map((option) => {
          const isSelected = theme === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.optionButton, { borderColor: isSelected ? selectedColor : "transparent" }]}
              onPress={() => setTheme(option)}
            >
              <ThemedText style={{ color: isSelected ? selectedColor : textColor }}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          );
        })}

        <View style={{ marginTop: 40 }}>
          <Button title="Clear App Data" color="#FF3B30" onPress={clearStorage} />
        </View>

        <View style={{ marginTop: 40 }}>
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
});