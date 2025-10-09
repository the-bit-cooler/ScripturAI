import AsyncStorage from "@react-native-async-storage/async-storage";
import { PlatformPressable } from '@react-navigation/elements';
import { FlashList } from "@shopify/flash-list";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { memo, useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import PagerView from "react-native-pager-view";

import { useThemeColor } from "@/hooks/use-theme-color";
import { useVerseContextMenu } from "@/hooks/use-verse-context-menu";
import { fetchChapter } from "@/utilities/fetch-chapter";

import { ThemedText } from "@/components/themed-text";
import { CenteredActivityIndicator } from "@/components/ui/centered-activity-indicator";
import { IconSymbol } from "@/components/ui/icon-symbol";

import { Colors } from "@/constants/theme";
import { UserPreferences } from "@/constants/user-preferences";
import { Verse } from "@/types/verse";

import bookChapterCounts from "@/assets/data/bible-book-chapter-counts.json";

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
  bibleVersion: string;
  bibleBook: string;
  chapterNumber: number;
  shouldLoad: boolean;
  onContextMenu: (verse: Verse) => void;
}

const ChapterPage = ({ bibleVersion, bibleBook, chapterNumber, shouldLoad, onContextMenu }: ChapterPageProps) => {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (shouldLoad && !hasFetched.current) {
      const loadChapter = async () => {
        try {
          setLoading(true);
          const chapterData = await fetchChapter(bibleVersion, bibleBook, chapterNumber);
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
  }, [bibleVersion, bibleBook, chapterNumber, shouldLoad]);

  if (!shouldLoad || loading) {
    return (
      <CenteredActivityIndicator size="large" />
    );
  }

  if ((verses?.length ?? 0) === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ThemedText style={{ color: Colors.error.text, fontWeight: "bold" }}>Chapter failed to load.</ThemedText>
        <ThemedText style={{ color: Colors.error.text, fontWeight: "bold" }}>Please try again later.</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.verseContainer]}>
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
    </View>
  );
};

type BookReaderProps = {
  book: string;
  bibleChapter: number
}

const BookReader = ({ book, bibleChapter }: BookReaderProps) => {
  const router = useRouter();
  const [version, setVersion] = useState('KJV');
  const [chapter, setChapter] = useState(bibleChapter);
  const [title, setTitle] = useState(`${book} 1`);
  const [loadedChapters, setLoadedChapters] = useState<number[]>([bibleChapter]);
  const { onContextMenu } = useVerseContextMenu();

  const totalChapters = (bookChapterCounts as Record<string, number>)[book];
  const chapterNumbers = Array.from({ length: totalChapters }, (_, i) => i + 1);

  useEffect(() => {
    const loadModePreference = async () => {
      try {
        const storedVersion = await AsyncStorage.getItem(UserPreferences.bible_version);
        if (storedVersion) {
          setVersion(storedVersion);
        }
      } catch (err) {
        console.error('Error loading AI mode preference:', err);
      }
    };
    loadModePreference();
  });

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
          headerRight: ({ tintColor }) =>
            <PlatformPressable
              onPress={() => router.push({ pathname: '/bible-chapter-summary', params: { version, book, chapter } })}
              style={{ marginRight: 20 }}
            >
              <IconSymbol size={28} name="list.bullet.rectangle" color={tintColor!} />
            </PlatformPressable>,
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
        onPageSelected={async (e) => {
          const newChapter = e.nativeEvent.position + 1;
          setChapter(newChapter); // Update current chapter
          setTitle(`${book} ${newChapter}`); // Finalize title
          preloadAdjacentChapters(newChapter);

          try {
            await AsyncStorage.setItem(
              UserPreferences.saved_reading_location,
              JSON.stringify({ book, chapter: newChapter })
            );
          } catch (error) {
            console.error("Error saving reading location:", error);
          }
        }}
      >
        {chapterNumbers.map((ch) => (
          <ChapterPage
            key={ch}
            bibleVersion={version}
            bibleBook={book}
            chapterNumber={ch}
            shouldLoad={loadedChapters.includes(ch)}
            onContextMenu={onContextMenu}
          />
        ))}
      </PagerView>
    </>
  );
}

type BookReaderRouteParams = {
  book?: string;
  chapter?: string;
};

export default function Index() {
  const router = useRouter();
  const { book: selectedBook, chapter: selectedChapter } = useLocalSearchParams<BookReaderRouteParams>();
  const [book, setBook] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // 🔹 When book changes (e.g. user picks a new one), save it
  useEffect(() => {
    if (selectedBook) {
      setBook(selectedBook);
      try {
        let selectedChapterNumber = selectedChapter ? Number(selectedChapter) : 1;
        AsyncStorage.setItem(
          UserPreferences.saved_reading_location,
          JSON.stringify({ book: selectedBook, chapter: selectedChapterNumber })
        );
      } catch (error) {
        console.error("Error saving reading location:", error);
      }
    }
  }, [selectedBook, selectedChapter]);

  // 🔹 On first load, if no book in params, restore from AsyncStorage
  useEffect(() => {
    const restoreSavedReadingLocation = async () => {
      try {
        if (!selectedBook) {
          const stored = await AsyncStorage.getItem(UserPreferences.saved_reading_location);
          if (stored) {
            const { book: savedBook, chapter: savedChapter } = JSON.parse(stored) as { book: string; chapter: number };
            if (savedBook) {
              setBook(savedBook);
              setChapter(savedChapter || 1);
            }
          } else {
            setBook('John'); // default
            setChapter(1);
          }
        }
      } catch (error) {
        console.error("Error restoring saved reading location:", error);
        setBook('John'); // default
        setChapter(1);
      } finally {
        setLoading(false);
      }
    };

    restoreSavedReadingLocation();
  }, [selectedBook, router]);

  // 🔹 UI
  if (loading || !book) {
    return (
      <CenteredActivityIndicator size="large" />
    );
  }

  return (
    <BookReader book={book} bibleChapter={chapter!} />
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