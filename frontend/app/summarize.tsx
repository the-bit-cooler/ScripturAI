
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { CenteredActivityIndicator } from '@/components/ui/centered-activity-indicator';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { useThemeColor } from '@/hooks/use-theme-color';

import { Colors } from "@/constants/theme";
import { UserPreferences } from "@/constants/user-preferences";

type SummarizeChapterParams = {
  version: string;
  book: string;
  chapter: string;
};

export default function SummarizeChapterScreen() {
  const { version, book, chapter } = useLocalSearchParams<SummarizeChapterParams>();
  const [summary, setSummary] = useState<string>('');
  const [mode, setMode] = useState<string | null>(null); // ✅ null means "not loaded yet"
  const [loading, setLoading] = useState(true);

  // ✅ use theme defaults
  const headerBackgroundColor = useThemeColor({}, 'cardBackground');
  const iconColor = useThemeColor({}, 'textSecondary');

  useEffect(() => {
    const loadModePreference = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(UserPreferences.ai_mode);
        setMode(storedMode || 'simple'); // set default if nothing stored
      } catch (err) {
        console.error('Error loading AI mode preference:', err);
        setMode('simple');
      }
    };
    loadModePreference();
  });


  const fetchSimilarVerses = useCallback(async () => 
    {if (!mode) return; // wait until mode is loaded
    try {
      setLoading(true);

      const url = `${process.env.EXPO_PUBLIC_AZURE_FUNCTION_URL}${version}/${book}/${chapter}/summarize/${mode}?code=${process.env.EXPO_PUBLIC_AZURE_FUNCTION_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API Error ${response.status}: Failed to fetch a summary for ${version}:${book}:${chapter}.`);

      setSummary(await response.text());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [version, book, chapter, mode]);

  useEffect(() => {
    fetchSimilarVerses();
  }, [fetchSimilarVerses]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: headerBackgroundColor, dark: headerBackgroundColor, sepia: headerBackgroundColor }}
      headerImage={
        <IconSymbol
          size={220}
          color={iconColor}
          name="list.bullet.rectangle"
          style={styles.headerImage}
        />
      }>
      <View style={[styles.container]}>
        {loading ? (
          <CenteredActivityIndicator size="large" />
        ) : summary ? (
          <View style={[styles.summaryTheme]}>
            <ThemedText style={styles.summaryText}>
              {summary}
            </ThemedText>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ThemedText style={{ color: Colors.error.text, fontWeight: "bold" }}>No summary at the moment.</ThemedText>
            <ThemedText style={{ color: Colors.error.text, fontWeight: "bold" }}>Please try again later.</ThemedText>
          </View>
        )}
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  headerImage: {
    color: '#808080',
    margin: 'auto',
  },
  summaryTheme: {
    marginBottom: 15,
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 16,
  },
});