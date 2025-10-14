import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from '@react-native-picker/picker';
import { PlatformPressable } from '@react-navigation/elements';
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { Stack, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View, ViewToken } from "react-native";
import Modal from "react-native-modal";
import PagerView from "react-native-pager-view";

import { ThemedText } from "@/components/themed-text";
import { CenteredActivityIndicator } from "@/components/ui/centered-activity-indicator";
import { IconSymbol } from "@/components/ui/icon-symbol";
import BibleChapterSummary from "./bible-chapter-summary";

import { getBibleBookChapterCount } from "@/utilities/get-bible-book-chapter-count";
import { getBibleBookList } from "@/utilities/get-bible-book-list";

import { useThemeColor } from "@/hooks/use-theme-color";
import { useVerseContextMenu } from "@/hooks/use-verse-context-menu";

import { UserPreferences } from "@/constants/user-preferences";

import { Verse } from "@/types/verse";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState<string | null>(null);
  const [book, setBook] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [page, setPage] = useState<number | null>(null);
  const [showReadingLocationPickerModal, setShowReadingLocationPickerModal] = useState(false);

  const modalBackgroundColor = useThemeColor({}, "cardBackground");
  const modalPickerColor = useThemeColor({}, "text");

  useEffect(() => {
    const loadVersion = async () => {
      const defaultVersion = 'KJV';

      try {
        const storedVersion = await AsyncStorage.getItem(UserPreferences.bible_version);
        if (storedVersion) {
          setVersion(storedVersion);
        } else {
          await AsyncStorage.setItem(UserPreferences.bible_version, defaultVersion);

          setVersion(defaultVersion);
        }
      } catch {
        setVersion(defaultVersion);
      }
      setBook('John');
      setChapter(1);
      setPage(0); // Pages are zero-indexed in PagerView
    };

    loadVersion();
  }, []);

  // 🔹 Load chapter data...
  useEffect(() => {
    const loadChapterData = async () => {
      if (!version || !book || !chapter) return;

      try {
        setLoading(true);

        const cacheKey = `${version}:${book}:${chapter}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          setVerses(JSON.parse(cached));
          setLoading(false);
        } else {
          const url = `${process.env.EXPO_PUBLIC_AZURE_FUNCTION_URL}${version}/${book}/${chapter}?code=${process.env.EXPO_PUBLIC_AZURE_FUNCTION_KEY}`;
          const response = await fetch(url);
          if (response.ok) {
            const data: Verse[] = await response.json();
            setVerses(data);
            setLoading(false);

            // Cache API data but do not block thread by waiting
            await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
          }
        }
      } catch { }
    };

    loadChapterData();
  }, [version, book, chapter]);

  /**
   * Updates the current reading location (book, chapter, and/or page).
   *
   * ⚠️ Note: Because `BibleBookReader` is conditionally rendered based on data being fetched,
   * calling this callback causes a full remount — resetting all of its internal state.
   *
   * @param {Object} changed - The parts of the reading location that have changed.
   * @param {string} [changed.book] - Optional new book name (e.g., "John").
   * @param {number} [changed.chapter] - Optional new chapter number (1-based).
   * @param {number} [changed.page] - Optional new page index (0-based).
   * @returns {void}
   */
  const changeReadingLocation = useCallback((changed: ReadingLocationChange) => {
    if (changed.book) {
      setBook(changed.book);
    }
    if (changed.chapter) {
      setChapter(changed.chapter);
    }
    if (changed.page) {
      setPage(changed.page);
    }
  }, []);

  return (
    <>
      <Modal
        key='reading-location-picker-modal'
        isVisible={showReadingLocationPickerModal}
        onBackdropPress={() => setShowReadingLocationPickerModal(false)}
        onSwipeComplete={() => setShowReadingLocationPickerModal(false)}
        swipeDirection={['left', 'right']}
        animationIn="slideInDown"
        animationOut="slideOutUp"
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <View style={{ padding: 16, width: '80%' }}>
            <Picker
              style={{ opacity: .9 }}
              selectedValue={book}
              onValueChange={(bk) => {
                changeReadingLocation({ book: bk!, chapter: 1, page: 0 })
              }}
              itemStyle={{ borderRadius: 200, color: modalPickerColor, backgroundColor: modalBackgroundColor, fontWeight: 'bold', marginBottom: 30 }}
            >
              {getBibleBookList().map((bk) => (
                <Picker.Item key={bk} label={bk} value={bk} />
              ))}
            </Picker>
            <Picker
              style={{ opacity: .9 }}
              selectedValue={chapter}
              onValueChange={(ch) => {
                changeReadingLocation({ chapter: ch!, page: 0 })
              }}
              itemStyle={{ borderRadius: 200, color: modalPickerColor, backgroundColor: modalBackgroundColor, fontWeight: 'bold' }}
            >
              {Array.from({ length: getBibleBookChapterCount(book!) }, (_, i) => i + 1).map((ch) => (
                <Picker.Item key={ch} label={`Chapter ${ch}`} value={ch} />
              ))}
            </Picker>
          </View>
        </View>
      </Modal >
      {loading
        ?
        <CenteredActivityIndicator size="large" />
        :
        <BibleBookReader
          version={version!}
          book={book!}
          chapter={chapter!}
          page={page!}
          verses={verses}
          setShowReadingLocationPickerModal={setShowReadingLocationPickerModal}
          changeReadingLocation={changeReadingLocation}
        />
      }
    </>
  );
}

type ReadingLocationChange = {
  book?: string;
  chapter?: number;
  page?: number;
};

type BibleBookReaderParams = {
  version: string;
  book: string;
  chapter: number;
  page: number;
  verses: Verse[];
  setShowReadingLocationPickerModal: React.Dispatch<React.SetStateAction<boolean>>
  changeReadingLocation: (changed: ReadingLocationChange) => void;
};

function BibleBookReader({ version, book, chapter, page, verses, setShowReadingLocationPickerModal, changeReadingLocation }: BibleBookReaderParams) {
  const pagerRef = useRef<PagerView>(null);
  const [pageStarts, setPageStarts] = useState([0]); // 0-indexed starts
  const [isMeasuring, setIsMeasuring] = useState(true);
  const { onContextMenu } = useVerseContextMenu();
  const router = useRouter();

  const addNextPage = useCallback((nextStart: number) => {
    if (nextStart < verses.length) {
      setPageStarts((prev) => {
        if (prev[prev.length - 1] < nextStart) {
          return [...prev, nextStart];
        }
        return prev;
      });
    }
  }, [verses]);

  return (
    <>
      <Stack.Screen
        options={{
          title: `${book} ${chapter}`,
          headerLeft: ({ tintColor }) =>
            <PlatformPressable
              onPress={() => setShowReadingLocationPickerModal(true)}
            >
              <IconSymbol size={34} name="book.fill" color={tintColor!} />
            </PlatformPressable>,
          headerRight: ({ tintColor }) =>
            <PlatformPressable
              onPress={() => router.push({ pathname: '/settings', params: { version, book, chapter } })}
            >
              <IconSymbol size={34} name="gearshape.fill" color={tintColor!} />
            </PlatformPressable>
        }}
      />

      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={page}
      >
        <BibleChapterSummary
          version={version}
          book={book}
          chapter={chapter}
        />
        {pageStarts.map((start, index) => {
          if (isMeasuring) {
            return (
              <MeasuredPage
                key={index}
                start={start}
                verses={verses}
                isLast={index === pageStarts.length - 1}
                onContextMenu={onContextMenu}
                addNextPage={addNextPage}
                setIsMeasuring={setIsMeasuring}
              />
            );
          } else {
            const end = pageStarts[index + 1] || verses.length;
            const pageVerses = verses.slice(start, end);
            return (
              <Page
                key={index}
                chapter={chapter}
                page={index + 1}
                verses={pageVerses}
                onContextMenu={onContextMenu}
              />
            );
          }
        })}
      </PagerView>
    </>
  );
}

type PageProps = {
  chapter: number;
  page: number;
  verses: Verse[];
  onContextMenu: (verse: Verse) => void;
};

function Page({ chapter, page, verses, onContextMenu }: PageProps) {
  const flashListRef = useRef<FlashListRef<Verse>>(null);
  const verseNumberColor = useThemeColor({}, "verseNumber");

  useEffect(() => {
    flashListRef.current?.scrollToIndex({ index: 0, animated: false });
  }, [chapter, page]);

  return (
    <View
      style={styles.versesContainer}
    >
      <FlashList
        ref={flashListRef}
        data={verses}
        // scrollEnabled={false}
        keyExtractor={(v) => v.verse.toString()}
        renderItem={({ item }) => (
          <VerseItem
            verse={item}
            verseNumberColor={verseNumberColor}
            onContextMenu={onContextMenu}
          />
        )}
      />
    </View>
  );
}

type VerseItemProps = {
  verse: Verse;
  verseNumberColor: string;
  onContextMenu: (verse: Verse) => void
};

type MeasuredPageProps = {
  start: number;
  verses: Verse[];
  isLast: boolean;
  onContextMenu: (verse: Verse) => void;
  addNextPage: (nextStart: number) => void
  setIsMeasuring: React.Dispatch<React.SetStateAction<boolean>>
};

function MeasuredPage({ start, verses, isLast, onContextMenu, addNextPage, setIsMeasuring }: MeasuredPageProps) {
  const [viewableCount, setViewableCount] = useState(0);
  const verseNumberColor = useThemeColor({}, "verseNumber");

  useEffect(() => {
    if (isLast && viewableCount > 0 && start + viewableCount < verses.length) {
      addNextPage(start + viewableCount);
    }
  }, [viewableCount, isLast, start, verses.length, addNextPage]);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Verse>[]; changed: ViewToken<Verse>[] }) => {
      let isLastVerse = false;

      // Assume viewableItems are sorted/consecutive; take length
      // Filter to ensure they're from the top (index 0 to n)
      const maxConsecutive = viewableItems.reduce((max, item) => {
        isLastVerse = item.item.verse === verses.length;
        if (item.index === max) return max + 1;
        return max;
      }, 0);
      if (maxConsecutive > viewableCount) {
        setViewableCount(maxConsecutive);
      }

      if (isLastVerse) {
        setIsMeasuring(false);
      }
    },
    [viewableCount, verses, setIsMeasuring]
  );

  const visibleData = verses.slice(start);

  return (
    <View
      style={[styles.versesContainer]}
    >
      <FlashList
        data={visibleData}
        scrollEnabled={false}
        keyExtractor={(v) => v.verse.toString()}
        renderItem={({ item, index }) => (
          <VerseItem
            verse={item}
            verseNumberColor={verseNumberColor}
            onContextMenu={onContextMenu}
          />
        )}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 90, // Only count fully visible
          minimumViewTime: 100,
        }}
      />
    </View>
  );
}

// Memoized VerseItem component
const VerseItem = memo(({ verse, verseNumberColor, onContextMenu }: VerseItemProps) => {
  return (
    <View
      style={styles.verseText}
    >
      <TouchableOpacity onLongPress={() => onContextMenu(verse)}>
        <ThemedText type="subtitle">
          <ThemedText
            type="defaultSemiBold"
            style={[styles.verseNumber, { color: verseNumberColor }]}
          >
            {"     "}
            {verse.verse}
            {"   "}
          </ThemedText>
          {verse.text}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
});

// Add a displayName for better devtools and to satisfy the linter rule
VerseItem.displayName = 'VerseItem';

const styles = StyleSheet.create({
  pagerView: {
    flex: 1,
  },
  versesContainer: {
    flex: 1,
  },
  verseText: {
    marginVertical: 7,
    paddingHorizontal: 16,
  },
  verseNumber: {
    fontWeight: "bold",
  }
});