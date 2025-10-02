
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CenteredActivityIndicator } from '@/components/ui/centered-activity-indicator';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSimilarVerses();
  }, []);

  const fetchSimilarVerses = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${process.env.EXPO_PUBLIC_AZURE_FUNCTION_URL}${version}/${book}/${chapter}/${verse}/explain/${mode}?code=${process.env.EXPO_PUBLIC_AZURE_FUNCTION_KEY}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      setExplanation(await response.text());
    } catch (err) {
      setError('Error fetching explanation. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={220}
          color="#808080"
          name={icon}
          style={styles.headerImage}
        />
      }>

    <ThemedView style={styles.container}>
      {loading ? (
        <CenteredActivityIndicator size="large" color="#00ff00" />
      ) : error ? (
        <ThemedText type="default" style={styles.errorText}>
          {error}
        </ThemedText>
      ) : explanation ? (
        <ThemedView style={styles.explanationTheme}>
          <ThemedText style={styles.explanationText}>
            {explanation}
          </ThemedText>
        </ThemedView>
      ) : (
        <ThemedText type="default">No explanation for now. Please try again later.</ThemedText>
      )}
    </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
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
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
});