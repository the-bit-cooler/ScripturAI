import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from '@react-native-picker/picker';
import { PlatformPressable } from '@react-navigation/elements';
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { Stack, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AppState, TouchableOpacity, View, ViewToken } from "react-native";
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

import { Verse } from "@/types/verse";
import { UserPreferences } from "@/constants/user-preferences";

type ReadingLocation = {
  version: string;
  book: string;
  chapter: number;
  page: number;
};

export default function BibleBookReader() {
  const [loading, setLoading] = useState(true);
  const [readingLocation, setReadingLocation] = useState<ReadingLocation | null>(null);
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const [measuredChapterPages, setMeasuredChapterPages] = useState<number[] | null>(null);
  const [showReadingLocationPickerModal, setShowReadingLocationPickerModal] = useState(false);

  const isInitialMount = useRef(true);
  const router = useRouter();

  const modalBackgroundColor = useThemeColor({}, "cardBackground");
  const modalPickerColor = useThemeColor({}, "text");

  // Load user's preferences 
  useEffect(() => {
    const loadUserPreferences = async () => {
      const defaultVersion = 'KJV';
      const defaultBibleBook = 'John';
      const defaultBibleChapter = 1;
      const defaultReaderPage = 0;
      try {
        const savedReadingLocation = await AsyncStorage.getItem(UserPreferences.saved_reading_location);
        if (savedReadingLocation) {
          setReadingLocation(JSON.parse(savedReadingLocation) as ReadingLocation)
        } else {
          let version = defaultVersion;
          const storedVersion = await AsyncStorage.getItem(UserPreferences.bible_version);
          if (storedVersion) {
            version = storedVersion;
          }
          setReadingLocation({ version, book: defaultBibleBook, chapter: defaultBibleChapter, page: defaultReaderPage });
        }
      } catch {
        setReadingLocation({ version: defaultVersion, book: defaultBibleBook, chapter: defaultBibleChapter, page: defaultReaderPage });
      }
    };

    loadUserPreferences();
  }, []);

  // Load chapter
  useEffect(() => {
    if (!readingLocation) return;

    const loadBibleChapter = async () => {
      try {
        const { version, book, chapter } = readingLocation;

        // --- Load cached measured pages for this chapter ---
        const measuredPagesCacheKey = `${version}:${book}:${chapter}:MeasuredPages`;
        const savedMeasuredPages = await AsyncStorage.getItem(measuredPagesCacheKey);
        if (savedMeasuredPages) {
          const parsed = JSON.parse(savedMeasuredPages);
          if (Array.isArray(parsed)) {
            setMeasuredChapterPages(parsed);
          } else {
            setMeasuredChapterPages(null);
          }
        } else {
          setMeasuredChapterPages(null);
        }

        // --- Load verses for this chapter ---
        const chapterCacheKey = `${version}:${book}:${chapter}`;
        const cachedChapter = await AsyncStorage.getItem(chapterCacheKey);
        if (cachedChapter) {
          const parsed = JSON.parse(cachedChapter);
          if (Array.isArray(parsed)) {
            setChapterVerses(parsed);
            setLoading(false);
            return;
          }
        }

        // Fetch chapter from API
        const url = `${process.env.EXPO_PUBLIC_AZURE_FUNCTION_URL}${version}/${book}/${chapter}?code=${process.env.EXPO_PUBLIC_AZURE_FUNCTION_KEY}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as Verse[];
          await AsyncStorage.setItem(chapterCacheKey, JSON.stringify(data));
          setChapterVerses(data);
        } else {
          setChapterVerses([]);
        }
      } catch (err) {
        console.warn("Error loading chapter", err);
        setChapterVerses([]);
      } finally {
        setLoading(false);
      }
    };

    loadBibleChapter();
  }, [readingLocation?.version, readingLocation?.book, readingLocation?.chapter]);

  // Save user's reading location
  useEffect(() => {
    const saveReadingLocation = async () => {
      if (readingLocation && !isInitialMount.current) {
        try {
          await AsyncStorage.setItem(UserPreferences.saved_reading_location, JSON.stringify(readingLocation));
        } catch { }
      }
    };

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") saveReadingLocation();  // Save when app is placed in background
    });

    if (isInitialMount.current) {
      isInitialMount.current = false;
    }

    return () => {
      subscription.remove();
      saveReadingLocation(); // Save on unmount
    };
  }, [readingLocation]);

  const changeReadingLocation = useCallback((changed: Partial<ReadingLocation>) => {
    if (changed.book !== readingLocation?.book || changed.version !== readingLocation?.version) {
      setChapterVerses([]);         // clear old book data
      setMeasuredChapterPages(null);    // clear measured pages cache
    }
    setLoading(changed.book !== readingLocation?.book || changed.version !== readingLocation?.version);
    setReadingLocation(prev => ({ ...prev!, ...changed }));
  }, [readingLocation]);

  return (
    <>
      {readingLocation && (
        <>
          <Stack.Screen
            options={{
              title: `${readingLocation.book} ${readingLocation.chapter}`,
              headerLeft: ({ tintColor }) => (
                <PlatformPressable onPress={() => setShowReadingLocationPickerModal(true)}>
                  <IconSymbol size={34} name="book.fill" color={tintColor!} />
                </PlatformPressable>
              ),
              headerRight: ({ tintColor }) => (
                <PlatformPressable onPress={() => router.push({ pathname: '/settings' })}>
                  <IconSymbol size={34} name="gearshape.fill" color={tintColor!} />
                </PlatformPressable>
              ),
            }}
          />
          <Modal
            key='reading-location-picker-modal'
            isVisible={showReadingLocationPickerModal}
            backdropOpacity={.05}
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
                  selectedValue={readingLocation.book}
                  onValueChange={(bk) => {
                    changeReadingLocation({ ...readingLocation, book: bk, chapter: 1, page: 0 });
                  }}
                  itemStyle={{ borderRadius: 200, color: modalPickerColor, backgroundColor: modalBackgroundColor, fontWeight: 'bold', marginBottom: 30 }}
                >
                  {getBibleBookList().map((bk) => (
                    <Picker.Item key={bk} label={bk} value={bk} />
                  ))}
                </Picker>
                <Picker
                  style={{ opacity: .9 }}
                  selectedValue={readingLocation.chapter}
                  onValueChange={(ch) => {
                    changeReadingLocation({ ...readingLocation, chapter: ch, page: 0 });
                  }}
                  itemStyle={{ borderRadius: 200, color: modalPickerColor, backgroundColor: modalBackgroundColor, fontWeight: 'bold' }}
                >
                  {Array.from({ length: getBibleBookChapterCount(readingLocation.book!) }, (_, i) => i + 1).map((ch) => (
                    <Picker.Item key={ch} label={`Chapter ${ch}`} value={ch} />
                  ))}
                </Picker>
              </View>
            </View>
          </Modal>
        </>
      )}
      {(loading || !chapterVerses.length) && (
        <CenteredActivityIndicator hint="Loading Book" size="large" />
      )}
      {(!loading && readingLocation && chapterVerses.length) && (
        <Pages
          key={`${readingLocation.version}-${readingLocation.book}`}
          readingLocation={readingLocation}
          chapterVerses={chapterVerses}
          measuredChapterPages={measuredChapterPages}
          changeReadingLocation={changeReadingLocation}
        />
      )}
    </>
  );
}

type PagesParams = {
  readingLocation: ReadingLocation;
  chapterVerses: Verse[];
  measuredChapterPages: number[] | null;
  changeReadingLocation: (changed: Partial<ReadingLocation>) => void;
};

function Pages({ readingLocation, chapterVerses, measuredChapterPages, changeReadingLocation }: PagesParams) {
  const pagerRef = useRef<PagerView>(null);
  const [chapterPageStarts, setChapterPageStarts] = useState<number[]>(measuredChapterPages ?? [0]);
  const [chapterDone, setChapterDone] = useState<boolean>(!!measuredChapterPages);
  const [isMeasuring, setIsMeasuring] = useState(!measuredChapterPages);

  const onContextMenu = useVerseContextMenu();

  // Mark measuring complete
  useEffect(() => {
    if (chapterDone) setIsMeasuring(false);
  }, [chapterDone]);

  useEffect(() => {
    const saveMeasuredPages = async () => {
      if (!isMeasuring && chapterPageStarts.length > 0) {
        const cacheKey = `${readingLocation.version}:${readingLocation.book}:${readingLocation.chapter}:MeasuredPages`;
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(chapterPageStarts));
        } catch (err) {
          console.warn("Failed to save measured pages", err);
        }
      }
    };
    saveMeasuredPages();
  }, [isMeasuring, chapterPageStarts, readingLocation.version, readingLocation.book]);

  // Reset on chapter change
  useEffect(() => {
    setChapterPageStarts(measuredChapterPages ?? [0]);
    setChapterDone(!!measuredChapterPages);
    setIsMeasuring(!measuredChapterPages);
  }, [measuredChapterPages, readingLocation.chapter]);

  // Add next page for a specific chapter
  const addNextPage = useCallback(
    (nextStart: number) => {
      if (nextStart < chapterVerses.length) {
        setChapterPageStarts((prev) => {
          if (prev[prev.length - 1] < nextStart) {
            return [...prev, nextStart];
          }
          return prev;
        });
      }
    },
    [chapterVerses]
  );

  const bibleBooks = getBibleBookList();

  return isMeasuring ? (
    <>
      <CenteredActivityIndicator hint="Loading Book" size="large" />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }}>
        {chapterPageStarts.map((start, pageIdx) => (
          <MeasuredPage
            key={`${start}-${pageIdx}`}
            start={start}
            verses={chapterVerses}
            isLast={pageIdx === chapterPageStarts.length - 1}
            onContextMenu={onContextMenu}
            addNextPage={addNextPage}
            setChapterDone={setChapterDone}
          />
        ))}
      </View>
    </>
  ) : (
    <PagerView
      ref={pagerRef}
      key={`${readingLocation.version}-${readingLocation.book}-${readingLocation.chapter}-${chapterPageStarts.length}`}
      style={{ flex: 1 }}
      initialPage={readingLocation.page === -1 ? chapterPageStarts.length : readingLocation.page}
      overdrag={true} // iOS
      overScrollMode="always" // Android
      onPageScroll={({ nativeEvent: { position, offset } }) => {
        const chapterCount = getBibleBookChapterCount(readingLocation.book);
        if (position >= chapterPageStarts.length && offset > 0) {
          if (readingLocation.chapter < chapterCount) {
            changeReadingLocation({
              ...readingLocation,
              chapter: readingLocation.chapter + 1,
              page: 0,
            });
          } else {
            const bookIndex = bibleBooks.indexOf(readingLocation.book);
            if (bookIndex < bibleBooks.length - 1) {
              changeReadingLocation({
                ...readingLocation,
                book: bibleBooks[bookIndex + 1],
                chapter: 1,
                page: 0,
              });
            }
          }
        }

        if (position < 0 && offset > 0) {
          if (readingLocation.chapter > 1) {
            changeReadingLocation({
              ...readingLocation,
              chapter: readingLocation.chapter - 1,
              page: -1,
            });
          } else {
            const bookIndex = bibleBooks.indexOf(readingLocation.book);
            if (bookIndex > 0) {
              const prevBook = bibleBooks[bookIndex - 1];
              const prevBookChapterCount = getBibleBookChapterCount(prevBook);
              changeReadingLocation({
                ...readingLocation,
                book: prevBook,
                chapter: prevBookChapterCount,
                page: -1,
              });
            }
          }
        }
      }}
      onPageSelected={({ nativeEvent: { position } }) => {
        changeReadingLocation({ ...readingLocation, page: position });
      }}
    >
      <ChapterSummary
        key={`summary-${readingLocation.chapter}`}
        version={readingLocation.version}
        book={readingLocation.book}
        chapter={readingLocation.chapter}
      />
      {chapterPageStarts.map((start, pageIdx) => (
        <Page
          key={`page-${pageIdx}`}
          chapter={readingLocation.chapter}
          page={pageIdx + 1}
          verses={chapterVerses.slice(start, chapterPageStarts[pageIdx + 1] || chapterVerses.length)}
          onContextMenu={onContextMenu}
        />
      ))}
    </PagerView>
  );
}


type ChapterSummaryProps = {
  version: string;
  book: string;
  chapter: number;
};

const ChapterSummary = memo(({ version, book, chapter }: ChapterSummaryProps) => {
  return (
    <BibleChapterSummary
      version={version}
      book={book}
      chapter={chapter}
    />
  );
});
ChapterSummary.displayName = 'ChapterSummary';

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
    <View style={{ flex: 1 }}>
      <FlashList
        ref={flashListRef}
        data={verses}
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

type MeasuredPageProps = {
  start: number;
  verses: Verse[];
  isLast: boolean;
  onContextMenu: (verse: Verse) => void;
  addNextPage: (nextStart: number) => void;
  setChapterDone: (done: boolean) => void;
};

function MeasuredPage({ start, verses, isLast, onContextMenu, addNextPage, setChapterDone }: MeasuredPageProps) {
  const [viewableCount, setViewableCount] = useState(0);
  const verseNumberColor = useThemeColor({}, "verseNumber");

  useEffect(() => {
    if (isLast && viewableCount > 0 && start + viewableCount < verses.length) {
      addNextPage(start + viewableCount);
    }
  }, [viewableCount, isLast, start, verses.length, addNextPage]);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Verse>[] }) => {
      let isLastVerse = false;
      const maxConsecutive = viewableItems.reduce((max, item) => {
        isLastVerse = item.item.verse === verses.length;
        if (item.index === max) return max + 1;
        return max;
      }, 0);
      if (maxConsecutive > viewableCount) {
        setViewableCount(maxConsecutive);
      }
      if (isLastVerse && isLast) {
        setChapterDone(true);
      }
    },
    [viewableCount, verses, isLast, setChapterDone]
  );

  const visibleData = verses.slice(start);

  return (
    <View style={{ flex: 1, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      <FlashList
        data={visibleData}
        scrollEnabled={false}
        keyExtractor={(v) => v.verse.toString()}
        renderItem={({ item }) => (
          <VerseItem
            verse={item}
            verseNumberColor={verseNumberColor}
            onContextMenu={onContextMenu}
          />
        )}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 90,
          minimumViewTime: 300,
        }}
      />
    </View>
  );
}

type VerseItemProps = {
  verse: Verse;
  verseNumberColor: string;
  onContextMenu: (verse: Verse) => void;
};

const VerseItem = memo(({ verse, verseNumberColor, onContextMenu }: VerseItemProps) => {
  return (
    <View style={{ marginVertical: 7, paddingHorizontal: 16 }}>
      <TouchableOpacity onLongPress={() => onContextMenu(verse)}>
        <ThemedText type="subtitle">
          <ThemedText
            type="defaultSemiBold"
            style={{ fontWeight: "bold", color: verseNumberColor }}
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
VerseItem.displayName = 'VerseItem';