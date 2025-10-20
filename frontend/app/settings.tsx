
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from 'expo-application';
import { Alert, Button, ScrollView, StyleSheet, Switch, View } from "react-native";
import { Picker } from '@react-native-picker/picker';

import { AppTheme, useAppTheme } from "@/hooks/use-app-theme-provider";
import { useAppPreferences } from "@/hooks/use-app-preferences-provider";
import { useThemeColor } from "@/hooks/use-theme-color";

import { Colors } from "@/constants/theme";
import { AiModeValues } from "@/constants/ai-modes";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { HorizontalThemedSeparator } from "@/components/ui/themed-separator";

export default function SettingsScreen() {
  const { theme, setTheme } = useAppTheme();
  const backgroundColor = useThemeColor({}, "cardBackground")
  const textColor = useThemeColor({}, "text");


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
          headerColor={textColor}
          pickerColor={textColor}
          setAppTheme={setTheme}
        />
        <HorizontalThemedSeparator marginVertical={0} />
        <AiModeSection
          headerColor={textColor}
          pickerColor={textColor}
        />
        <HorizontalThemedSeparator />
        <View style={{ marginTop: 10 }}>
          <Button title="Clear App Data" color={Colors.error.text} onPress={clearStorage} />
        </View>
        <View style={{ marginTop: 20, marginBottom: 30 }}>
          <Button title="About" onPress={showAbout} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

type AppearanceSectionProps = {
  appTheme: AppTheme;
  headerColor: string;
  pickerColor: string;
  setAppTheme: (theme: AppTheme) => void
}

const AppearanceSection = ({ appTheme, headerColor, pickerColor, setAppTheme }: AppearanceSectionProps) => {
  const themeOptions = ["light", "dark", "sepia", "system"] as const;
  const themeOptionLabels = ["Light Mode", "Dark Mode", "Reading Mode", "System Default"] as const;

  return (
    <View>
      <ThemedText type="subtitle" style={{ color: headerColor }}>
        Appearance
      </ThemedText>
      <Picker
        selectedValue={appTheme}
        style={{ marginVertical: -10 }}
        itemStyle={{ borderRadius: 200, color: pickerColor, backgroundColor: 'transparent', fontWeight: 'bold' }}
        onValueChange={(theme) => setAppTheme(theme)}
      >
        {themeOptions.map((option, index) => {
          return (
            <Picker.Item key={option} label={themeOptionLabels[index]} value={option} />
          );
        })}
      </Picker>
    </View>
  );
};

type AiModeSectionProps = {
  headerColor: string;
  pickerColor: string;
}

const AiModeSection = ({ headerColor, pickerColor }: AiModeSectionProps) => {
  const { aiMode, setAiMode, allowThinkingSound, setAllowThinkingSound } = useAppPreferences();

  return (
    <>
      <View style={{ marginTop: 20 }}>
        <ThemedText type="subtitle" style={{ color: headerColor, marginBottom: 0 }}>
          AI Mode
        </ThemedText>
        <Picker
          selectedValue={aiMode}
          onValueChange={(mode) => setAiMode(mode)}
          style={{ marginTop: -40 }}
          itemStyle={{ borderRadius: 200, color: pickerColor, backgroundColor: 'transparent', fontWeight: 'bold' }}
        >
          {AiModeValues.map((option) => {
            return (
              <Picker.Item key={option} label={option.charAt(0).toUpperCase() + option.slice(1)} value={option} />
            );
          })}
        </Picker>
      </View>
      <View style={styles.soundToggleContainer}>
        <ThemedText style={styles.soundToggleLabel}>Enable Thinking Sound</ThemedText>
        <Switch
          value={allowThinkingSound}
          onValueChange={(value) => setAllowThinkingSound(value)}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
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