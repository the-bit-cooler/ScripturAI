
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CenteredActivityIndicator } from '@/components/ui/centered-activity-indicator';

import { Verse } from "@/types/verse";

type SimilarVerseParams = {
  version: string;
  book: string;
  chapter: string;
  verse: string;
};

export default function SimilarVerseScreen() {
  const { version, book, chapter, verse } = useLocalSearchParams<SimilarVerseParams>();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSimilarVerses = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`${process.env.EXPO_PUBLIC_AZURE_FUNCTION_URL}${version}/${book}/${chapter}/${verse}/similar?code=${process.env.EXPO_PUBLIC_AZURE_FUNCTION_KEY}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      setVerses(await response.json());
    } catch (err) {
      setError('Error fetching similar verses. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [version, book, chapter, verse]);

  useEffect(() => {
    fetchSimilarVerses();
  }, [fetchSimilarVerses]);

  const renderVerseItem = ({ item }: { item: Verse }) => (
    <ThemedView style={styles.verseItem}>
      <ThemedText type="subtitle" style={styles.verseId}>
        {item.verseId}
      </ThemedText>
      <ThemedText style={styles.verseText}>
        {item.text}
      </ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      {loading ? (
        <CenteredActivityIndicator size="large" />
      ) : error ? (
        <ThemedText type="default" style={styles.errorText}>
          {error}
        </ThemedText>
      ) : verses.length === 0 ? (
        <ThemedText type="default">No similar verses found.</ThemedText>
      ) : (
        <FlatList
          data={verses}
          renderItem={renderVerseItem}
          keyExtractor={(item) => item.verseId}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  listContainer: {
    paddingBottom: 20,
  },
  verseItem: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 8,
    // backgroundColor: '#f5f5f5',
  },
  verseId: {
    marginBottom: 5,
  },
  verseText: {
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
});