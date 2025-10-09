
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PlatformPressable } from '@react-navigation/elements';
import Markdown from 'react-native-markdown-display';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import AiThinkingIndicator from '@/components/ui/ai-thinking-indicator';
import { IconSymbol } from "@/components/ui/icon-symbol";

import { useThemeColor } from '@/hooks/use-theme-color';

import { shareMarkdownAsPdf } from "@/utilities/share-markdown-as-pdf";
import { getBibleVersionDisplayName } from "@/utilities/get-bible-version-display-name";

import { AiModes } from '@/constants/ai-modes';
import { Colors } from "@/constants/theme";
import { UserPreferences } from "@/constants/user-preferences";

type BibleVerseExplanationScreenParams = {
  version: string;
  book: string;
  chapter: string;
  verse: string;
  text: string;
};

export default function BibleVerseExplanationScreen() {
  const { version, book, chapter, verse, text } = useLocalSearchParams<BibleVerseExplanationScreenParams>();
  const [explanation, setExplanation] = useState<string>('');
  const [mode, setMode] = useState<string | null>(null); // ✅ null means "not loaded yet"
  const [loading, setLoading] = useState(true);

  // ✅ use theme defaults
  const headerBackgroundColor = useThemeColor({}, 'cardBackground');
  const headerTintColor = useThemeColor({}, 'tint');
  const markdownBackgroundColor = useThemeColor({}, 'cardBackground');
  const markdownTextColor = useThemeColor({}, 'text');

  const navigation = useNavigation();

  useEffect(() => {
    const sharePdf = async () => {
      try {
        await shareMarkdownAsPdf(explanation, `${book} ${chapter}:${verse}`, mode!);
      } catch (err) {
        console.error('Error loading AI mode preference:', err);
      }
    };
    navigation.setOptions({
      headerTitle: `Explain ${book} ${chapter}:${verse}`, // ✅ dynamically update the modal title
      headerRight: () => (
        <PlatformPressable
          onPress={sharePdf}
        >
          <IconSymbol name="square.and.arrow.up" size={34} color={headerTintColor!} style={{ backgroundColor: 'transparent' }} />
        </PlatformPressable>
      )
    });
  }, [navigation, version, book, chapter, verse, explanation, mode, headerTintColor]);

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

  const fetchBibleVerseExplanation = useCallback(async (cacheKey: string) => {
    if (!mode) return; // wait until mode is loaded
    try {
      setLoading(true);

      const url = `${process.env.EXPO_PUBLIC_AZURE_FUNCTION_URL}${version}/${book}/${chapter}/${verse}/explain/${mode}?code=${process.env.EXPO_PUBLIC_AZURE_FUNCTION_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API Error ${response.status}: Failed to fetch any insight for ${version}:${book}:${chapter}:${verse}.`);

      const result = await response.text();
      setExplanation(result);
      await AsyncStorage.setItem(cacheKey, result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [version, book, chapter, verse, mode]);

  useEffect(() => {
    const loadExplanation = async () => {
      const cacheKey = `${version}:${book}:${chapter}:${verse}:Explanation:${mode}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        setExplanation(cached);
        setLoading(false);
        return;
      }

      fetchBibleVerseExplanation(cacheKey);
    };

    loadExplanation();
  }, [fetchBibleVerseExplanation, version, book, chapter, verse, mode]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: headerBackgroundColor, dark: headerBackgroundColor, sepia: headerBackgroundColor }}
      headerImage={
        <View style={styles.verseHeaderContainer}>
          <ThemedText type="title" style={styles.verseHeaderText}>
            {text}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.versionHeaderText}>
            {getBibleVersionDisplayName(version)}
          </ThemedText>
        </View>
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
          <View style={styles.noExplanationContainer}>
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
  verseHeaderContainer: {
    margin: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  verseHeaderText: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  versionHeaderText: {
    fontSize: 16,
    opacity: 0.8,
    marginTop: 4,
    textAlign: 'center',
  },
  noExplanationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});