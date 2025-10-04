
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { CenteredActivityIndicator } from '@/components/ui/centered-activity-indicator';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';

import { useThemeColor } from '@/hooks/use-theme-color';

import { Colors } from "@/constants/theme";

type VerseExplanationParams = {
  version: string;
  book: string;
  chapter: string;
  verse: string;
  mode: string;
  icon: IconSymbolName;
};

export default function VerseExplanationScreen() {
  const { version, book, chapter, verse, mode, icon } = useLocalSearchParams<VerseExplanationParams>();
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // ✅ use theme defaults
  const headerBg = useThemeColor({}, 'cardBackground');
  const iconColor = useThemeColor({}, 'textSecondary');

  const fetchSimilarVerses = useCallback(async () => {
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
    fetchSimilarVerses();
  }, [fetchSimilarVerses]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: headerBg, dark: headerBg, sepia: headerBg }}
      headerImage={
        <IconSymbol
          size={220}
          color={iconColor}
          name={icon}
          style={styles.headerImage}
        />
      }>
      <View style={styles.container}>
        {loading ? (
          <CenteredActivityIndicator size="large" />
        ) : explanation ? (
          <View style={styles.explanationTheme}>
            <ThemedText style={styles.explanationText}>
              {explanation}
            </ThemedText>
          </View>
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