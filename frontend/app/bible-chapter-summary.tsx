import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PlatformPressable } from '@react-navigation/elements';
import Markdown from 'react-native-markdown-display';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import AiThinkingIndicator from '@/components/ui/ai-thinking-indicator';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { shareMarkdownAsPdf } from "@/utilities/share-markdown-as-pdf";

import { useThemeColor } from '@/hooks/use-theme-color';

import { AiModes } from '@/constants/ai-modes';
import { UserPreferences } from "@/constants/user-preferences";

type BibleChapterSummaryParams = {
  version: string;
  book: string;
  chapter: number;
};

export default function BibleChapterSummary({ version, book, chapter }: BibleChapterSummaryParams) {
  const [summary, setSummary] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null); // ✅ null means "not loaded yet"
  const [loading, setLoading] = useState(true);

  // ✅ use theme defaults
  const headerBackgroundColor = useThemeColor({}, 'cardBackground');
  const iconColor = useThemeColor({}, 'tint');
  const markdownBackgroundColor = useThemeColor({}, 'cardBackground');
  const markdownTextColor = useThemeColor({}, 'text');

  useEffect(() => {
    const loadModePreference = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(UserPreferences.ai_mode);
        setMode(storedMode || AiModes.devotional); // set default if nothing stored
      } catch {
        setMode(AiModes.devotional);
      }
    };
    loadModePreference();
  });

  const fetchBibleChapterSummary = useCallback(async (cacheKey: string) => {
    if (!mode) return; // wait until mode is loaded
    try {
      const url = `${process.env.EXPO_PUBLIC_AZURE_FUNCTION_URL}${version}/${book}/${chapter}/summarize/${mode}?code=${process.env.EXPO_PUBLIC_AZURE_FUNCTION_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API Error ${response.status}: Failed to fetch a summary for ${version}:${book}:${chapter}.`);

      const result = await response.text();
      setSummary(result);
      setLoading(false);
      await AsyncStorage.setItem(cacheKey, result);
    } catch { }
  }, [version, book, chapter, mode]);

  useEffect(() => {
    const loadSummary = async () => {
      const cacheKey = `${version}:${book}:${chapter}:Summary:${mode}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        setSummary(cached);
        setLoading(false);
        return;
      }

      await fetchBibleChapterSummary(cacheKey);
    };

    loadSummary();
  }, [fetchBibleChapterSummary, version, book, chapter, mode]);

  const sharePdf = async () => {
    if (summary)
      await shareMarkdownAsPdf(summary, `${book} ${chapter} (${version})`, mode!);
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: headerBackgroundColor, dark: headerBackgroundColor, sepia: headerBackgroundColor }}
      headerImage={
        <>
          <IconSymbol
            size={220}
            color={iconColor}
            name="book.pages.fill"
            style={styles.headerImage}
          />
          {/* ✅ Floating Share Button */}
          {summary && (
            <PlatformPressable
              onPress={sharePdf}
              style={styles.fab}
              pressOpacity={0.8}>
              <IconSymbol size={34} name="square.and.arrow.up" color={iconColor} />
            </PlatformPressable>
          )}
        </>
      }>
      <View style={[styles.container]}>
        {loading || !summary
          ? (
            <AiThinkingIndicator />
          ) : (
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
              {summary}
            </Markdown>
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
  fab: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 5,
  },
});