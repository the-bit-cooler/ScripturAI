
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import AiThinkingIndicator from '@/components/ui/ai-thinking-indicator';

import { Verse } from "@/types/verse";
import { Colors } from "@/constants/theme";
import { UserPreferences } from "@/constants/user-preferences";
import { AiModes } from '@/constants/ai-modes';

type SimilarVerseParams = {
  version: string;
  book: string;
  chapter: string;
  verse: string;
};

export default function SimilarBibleVersesScreen() {
  const { version, book, chapter, verse } = useLocalSearchParams<SimilarVerseParams>();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [mode, setMode] = useState<string | null>(null); // ✅ null means "not loaded yet"
  const [loading, setLoading] = useState(true);

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

  const fetchSimilarBibleVerses = useCallback(async () => {
    if (!mode) return; // wait until mode is loaded
    try {
      setLoading(true);
      
      const url = `${process.env.EXPO_PUBLIC_AZURE_FUNCTION_URL}${version}/${book}/${chapter}/${verse}/similar/${mode}?code=${process.env.EXPO_PUBLIC_AZURE_FUNCTION_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API Error ${response.status}: Failed to fetch similar verses for ${version}:${book}:${chapter}:${verse}.`);

      setVerses(await response.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [version, book, chapter, verse, mode]);

  useEffect(() => {
    fetchSimilarBibleVerses();
  }, [fetchSimilarBibleVerses]);

  const renderVerseItem = ({ item }: { item: Verse }) => (
    <View style={styles.verseItem}>
      <ThemedText type="subtitle" style={styles.verseId}>
        {item.verseId}
      </ThemedText>
      <ThemedText style={styles.verseText}>
        {item.text}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={[styles.container]}>
      {loading ? (
        <AiThinkingIndicator />
      ) : (verses?.length ?? 0) === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ThemedText style={{ color: Colors.error.text, fontWeight: "bold" }}>No similar verses found.</ThemedText>
          <ThemedText style={{ color: Colors.error.text, fontWeight: "bold" }}>Please try again later.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={verses}
          renderItem={renderVerseItem}
          keyExtractor={(item) => item.verseId}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  verseItem: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 8,
  },
  verseId: {
    marginBottom: 5,
  },
  verseText: {
    fontSize: 16,
  },
});