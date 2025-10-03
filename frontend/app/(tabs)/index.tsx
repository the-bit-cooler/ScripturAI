import { FlashList } from "@shopify/flash-list";
import { Stack, useLocalSearchParams } from "expo-router";
import { memo, useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import PagerView from "react-native-pager-view";

import { fetchChapter } from "@/utilities/fetch-chapter";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useVerseContextMenu } from "@/hooks/use-verse-context-menu";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { CenteredActivityIndicator } from "@/components/ui/centered-activity-indicator";

import { Verse } from "@/types/verse";
import { Colors } from "@/constants/theme";

import bookChapterCounts from "@/assets/data/book-chapter-counts.json";

type VerseItemProps = {
  verse: Verse;
  onContextMenu: (verse: Verse) => void
};

// Memoized VerseItem component
const VerseItem = memo(({ verse, onContextMenu }: VerseItemProps) => {
  const verseNumberColor = useThemeColor({}, "verseNumber");
  return (
    <TouchableOpacity onLongPress={() => onContextMenu(verse)}>
      <ThemedText
        type="subtitle"
        style={styles.verseText}
      >
        <ThemedText type="defaultSemiBold" style={[styles.verseNumber, { color: verseNumberColor }]}>
          {'     '}
          {verse.verse}
          {'   '}
        </ThemedText>
        {verse.text}
      </ThemedText>
    </TouchableOpacity>
  );
});

// Add a displayName for better devtools and to satisfy the linter rule
VerseItem.displayName = 'VerseItem';

type ChapterPageProps = {
  book: string;
  chapterNumber: number;
  shouldLoad: boolean;
  onContextMenu: (verse: Verse) => void;
}

const ChapterPage = ({ book, chapterNumber, shouldLoad, onContextMenu }: ChapterPageProps) => {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);
  const backgroundColor = useThemeColor({}, "verseBackground");

  useEffect(() => {
    if (shouldLoad && !hasFetched.current) {
      const loadChapter = async () => {
        try {
          setLoading(true);
          const chapterData = await fetchChapter("KJV", book, chapterNumber);
          setVerses(chapterData);
          hasFetched.current = true;
        } catch (error) {
          console.error(`Failed to load chapter ${chapterNumber}:`, error);
          setVerses([]);
        } finally {
          setLoading(false);
        }
      };

      loadChapter();
    }
  }, [book, chapterNumber, shouldLoad]);

  if (!shouldLoad || loading) {
    return (
      <CenteredActivityIndicator size="large" />
    );
  }

  if ((verses?.length ?? 0) === 0) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ThemedText style={{ color: Colors.error.text, fontWeight: "bold" }}>Chapter failed to load. Please try again later.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.verseContainer, { backgroundColor }]}>
      <FlashList
        data={verses}
        keyExtractor={(verse) => verse.verse.toString()}
        renderItem={({ item: verse }) => (
          <VerseItem
            verse={verse}
            onContextMenu={onContextMenu}
          />
        )}
      />
    </ThemedView>
  );
};

export default function BookReader() {
  let { book } = useLocalSearchParams<{ book: string }>();
  if (!book) {
    book = "John"; // Default book if none provided
  }

  const [chapter, setChapter] = useState(1);
  const [title, setTitle] = useState(`${book} 1`);
  const [loadedChapters, setLoadedChapters] = useState<number[]>([1]); // Start with chapter 1
  const { onContextMenu } = useVerseContextMenu();

  const totalChapters = (bookChapterCounts as Record<string, number>)[book];
  const chapterNumbers = Array.from({ length: totalChapters }, (_, i) => i + 1);

  // Preload adjacent chapters
  const preloadAdjacentChapters = (currentChapter: number) => {
    const adjacentChapters = [
      currentChapter,
      currentChapter - 1,
      currentChapter + 1,
    ].filter((ch) => ch >= 1 && ch <= totalChapters && !loadedChapters.includes(ch));

    if (adjacentChapters.length > 0) {
      setLoadedChapters((prev) => [...new Set([...prev, ...adjacentChapters])]);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: title,
        }}
      />
      <PagerView
        style={{ flex: 1 }}
        initialPage={chapter - 1} // Start at the selected chapter
        offscreenPageLimit={1} // Render current + 1 adjacent page each side
        onPageScroll={(e) => {
          const { position, offset } = e.nativeEvent;
          // Calculate the current chapter during swipe (1-based)
          const currentChapter = Math.round(position + offset) + 1;
          setTitle(`${book} ${currentChapter}`);
        }}
        onPageSelected={(e) => {
          const newChapter = e.nativeEvent.position + 1;
          setChapter(newChapter); // Update current chapter
          setTitle(`${book} ${newChapter}`); // Finalize title
          preloadAdjacentChapters(newChapter);
        }}
      >
        {chapterNumbers.map((ch) => (
          <ChapterPage
            key={ch}
            chapterNumber={ch}
            book={book}
            shouldLoad={loadedChapters.includes(ch)}
            onContextMenu={onContextMenu}
          />
        ))}
      </PagerView>
    </>
  );
}

const styles = StyleSheet.create({
  verseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verseText: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  verseNumber: {
    fontWeight: "bold",
  }
});