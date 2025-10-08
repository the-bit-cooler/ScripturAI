
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import AiThinkingIndicator from '@/components/ui/ai-thinking-indicator';

import { useThemeColor } from '@/hooks/use-theme-color';

import { AiModes } from '@/constants/ai-modes';
import { Colors } from "@/constants/theme";
import { UserPreferences } from "@/constants/user-preferences";

type BibleVerseExplanationScreenParams = {
  version: string;
  book: string;
  chapter: string;
  verse: string;
};

export default function BibleVerseExplanationScreen() {
  const { version, book, chapter, verse } = useLocalSearchParams<BibleVerseExplanationScreenParams>();
  const [explanation, setExplanation] = useState<string>('');
  const [mode, setMode] = useState<string | null>(null); // ✅ null means "not loaded yet"
  const [loading, setLoading] = useState(true);

  // ✅ use theme defaults
  const headerBackgroundColor = useThemeColor({}, 'cardBackground');
  const iconColor = useThemeColor({}, 'textSecondary');
  const markdownBackgroundColor = useThemeColor({}, 'cardBackground');
  const markdownTextColor = useThemeColor({}, 'text');

  useEffect(() => {
    const loadModePreference = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(UserPreferences.ai_mode);
        setMode(storedMode || AiModes.devotional); // set default if nothing stored
      } catch (err) {
        console.error('Error loading AI mode preference:', err);
        setMode(AiModes.devotional);
      }
    };
    loadModePreference();
  });

  const fetchBibleVerseExplanation = useCallback(async () => {
    if (!mode) return; // wait until mode is loaded
    try {
      setLoading(true);

      const url = `${process.env.EXPO_PUBLIC_AZURE_FUNCTION_URL}${version}/${book}/${chapter}/${verse}/explain/${mode}?code=${process.env.EXPO_PUBLIC_AZURE_FUNCTION_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API Error ${response.status}: Failed to fetch any insight for ${version}:${book}:${chapter}:${verse}.`);

      setExplanation(await response.text());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [version, book, chapter, verse, mode]);

  useEffect(() => {
    fetchBibleVerseExplanation();
  }, [fetchBibleVerseExplanation]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: headerBackgroundColor, dark: headerBackgroundColor, sepia: headerBackgroundColor }}
      headerImage={
        <IconSymbol
          size={220}
          color={iconColor}
          name='book.fill'
          style={styles.headerImage}
        />
      }>
      <View style={styles.container}>
        {loading ? (
          <AiThinkingIndicator />
        ) : explanation ? (
          <Markdown style={{
            body: { color: markdownTextColor },
            heading1: { color: markdownTextColor },
            heading2: { color: markdownTextColor },
            heading3: { color: markdownTextColor },
            blockquote: {
              backgroundColor: markdownBackgroundColor,
              color: markdownTextColor,
              borderLeftWidth: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
            },
            code_block: {
              backgroundColor: markdownBackgroundColor,
              color: markdownTextColor,
              borderRadius: 4,
              paddingHorizontal: 4,
            },
            code_inline: {
              backgroundColor: markdownBackgroundColor,
              color: markdownTextColor,
              borderRadius: 4,
              paddingHorizontal: 4,
            },
            fence: {
              backgroundColor: markdownBackgroundColor,
              color: markdownTextColor,
              padding: 8,
              borderRadius: 8,
            },
          }}>
            {explanation}
          </Markdown>
        ) : (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ThemedText style={{ color: Colors.error.text, fontWeight: "bold" }}>No insight at the moment.</ThemedText>
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
  explanationTheme: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 8,
  },
  explanationText: {
    fontSize: 16,
  },
});