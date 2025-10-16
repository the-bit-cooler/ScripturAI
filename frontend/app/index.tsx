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
  const [bookVerses, setBookVerses] = useState<Verse[][]>([]);
  const [measuredPages, setMeasuredPages] = useState<number[][] | null>(null);
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

  // Load entire book
  useEffect(() => {
    if (!readingLocation) return;

    const loadBookData = async () => {
      try {
        const chapterCount = getBibleBookChapterCount(readingLocation.book);

        // Load measured pages (if any)
        const measuredPagesCacheKey = `${readingLocation.version}:${readingLocation.book}:MeasuredPages`;
        const savedMeasuredPages = await AsyncStorage.getItem(measuredPagesCacheKey);
        if (savedMeasuredPages) {
          const parsed = JSON.parse(savedMeasuredPages);
          if (Array.isArray(parsed)) {
            setMeasuredPages(parsed);
          }
        }

        // Load chapters
        const promises = Array.from({ length: chapterCount }, (_, i) => {
          const ch = i + 1;
          const chapterCacheKey = `${readingLocation.version}:${readingLocation.book}:${ch}`;
          return AsyncStorage.getItem(chapterCacheKey).then(cached => {
            if (cached) {
              return JSON.parse(cached) as Verse[];
            }
            const url = `${process.env.EXPO_PUBLIC_AZURE_FUNCTION_URL}${readingLocation.version}/${readingLocation.book}/${ch}?code=${process.env.EXPO_PUBLIC_AZURE_FUNCTION_KEY}`;
            return fetch(url).then(res => {
              if (res.ok) {
                return res.json().then(data => {
                  AsyncStorage.setItem(chapterCacheKey, JSON.stringify(data));
                  return data as Verse[];
                });
              }
              return [];
            });
          });
        });

        const allChapters = await Promise.all(promises);
        setBookVerses(allChapters);
        setLoading(false);
      } catch { }
    };

    loadBookData();
  }, [readingLocation?.version, readingLocation?.book]);

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
                    changeReadingLocation({ ...readingLocation, book: bk!, chapter: 1, page: 0 });
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
                    changeReadingLocation({ ...readingLocation, chapter: ch!, page: 0 });
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
      {(loading || !bookVerses.length) && (
        <CenteredActivityIndicator hint="Loading Book" size="large" />
      )}
      {(!loading && readingLocation && bookVerses.length) && (
        <Pages
          key={`${readingLocation.version}-${readingLocation.book}`}
          readingLocation={readingLocation}
          bookVerses={bookVerses}
          measuredPages={measuredPages}
          changeReadingLocation={changeReadingLocation}
        />
      )}
    </>
  );
}

type PagesParams = {
  readingLocation: ReadingLocation;
  bookVerses: Verse[][];
  measuredPages: number[][] | null;
  changeReadingLocation: (changed: Partial<ReadingLocation>) => void;
};

function Pages({ readingLocation, bookVerses, measuredPages, changeReadingLocation }: PagesParams) {
  const pagerRef = useRef<PagerView>(null);
  const [chapterPageStarts, setChapterPageStarts] = useState<number[][]>(measuredPages ?? bookVerses.map(() => [0]));
  const [chapterDone, setChapterDone] = useState<boolean[]>(Array(bookVerses.length).fill(measuredPages ? true : false));
  const [isMeasuring, setIsMeasuring] = useState(!measuredPages);
  const [currentChapter, setCurrentChapter] = useState(readingLocation.chapter);
  const [currentLocalPage, setCurrentLocalPage] = useState(readingLocation.page);

  const onContextMenu = useVerseContextMenu();

  // Compute global page index
  const computeGlobalPage = useCallback((chapter: number, localPage: number): number => {
    let cum = 0;
    const chIdx = chapter - 1;
    for (let i = 0; i < chIdx; i++) {
      cum += 1 + chapterPageStarts[i].length; // 1 for summary + verse pages
    }
    if (localPage === 0) return cum;
    if (localPage === -1) return cum + chapterPageStarts[chIdx].length;
    return cum + localPage;
  }, [chapterPageStarts]);

  // Convert global page to chapter and local page
  const computeChapterAndLocalPage = useCallback((globalPage: number): { chapter: number; localPage: number } => {
    let cum = 0;
    for (let chIdx = 0; chIdx < bookVerses.length; chIdx++) {
      const pagesInChapter = 1 + chapterPageStarts[chIdx].length;
      if (globalPage < cum + pagesInChapter) {
        const localPage = globalPage - cum;
        return { chapter: chIdx + 1, localPage };
      }
      cum += pagesInChapter;
    }
    return { chapter: bookVerses.length, localPage: chapterPageStarts[bookVerses.length - 1].length };
  }, [bookVerses, chapterPageStarts]);

  // Handle chapter/page changes without book/version change
  useEffect(() => {
    if (readingLocation.chapter !== currentChapter || readingLocation.page !== currentLocalPage) {
      const globalPage = computeGlobalPage(readingLocation.chapter, readingLocation.page);
      pagerRef.current?.setPageWithoutAnimation(globalPage);
      setCurrentChapter(readingLocation.chapter);
      setCurrentLocalPage(readingLocation.page);
    }
  }, [readingLocation.chapter, readingLocation.page, computeGlobalPage]);

  // Check if all chapters are measured
  useEffect(() => {
    if (chapterDone.every(done => done)) {
      setIsMeasuring(false);
    }
  }, [chapterDone]);

  useEffect(() => {
    const saveMeasuredPages = async () => {
      if (!isMeasuring && chapterPageStarts.length > 0) {
        const cacheKey = `${readingLocation.version}:${readingLocation.book}:MeasuredPages`;
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(chapterPageStarts));
        } catch (err) {
          console.warn("Failed to save measured pages", err);
        }
      }
    };
    saveMeasuredPages();
  }, [isMeasuring, chapterPageStarts, readingLocation.version, readingLocation.book]);

  // Add next page for a specific chapter
  const addNextPage = useCallback((chapter: number, nextStart: number) => {
    const chIdx = chapter - 1;
    if (nextStart < bookVerses[chIdx].length) {
      setChapterPageStarts(prev => {
        const newStarts = [...prev];
        if (newStarts[chIdx][newStarts[chIdx].length - 1] < nextStart) {
          newStarts[chIdx] = [...newStarts[chIdx], nextStart];
        }
        return newStarts;
      });
    }
  }, [bookVerses]);

  // Total global pages
  const totalGlobalPages = bookVerses.reduce((acc, _, chIdx) => acc + 1 + chapterPageStarts[chIdx].length, 0);
  const bibleBooks = getBibleBookList();

  return isMeasuring ? (
    <>
      <CenteredActivityIndicator hint="Loading Book" size="large" />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }}>
        {bookVerses.map((verses, chIdx) => (
          chapterPageStarts[chIdx].map((start, pageIdx) => (
            <MeasuredPage
              key={`${chIdx}-${pageIdx}`}
              chapter={chIdx + 1}
              start={start}
              verses={verses}
              isLast={pageIdx === chapterPageStarts[chIdx].length - 1}
              onContextMenu={onContextMenu}
              addNextPage={addNextPage}
              setChapterDone={(done) => setChapterDone(prev => {
                const newDone = [...prev];
                newDone[chIdx] = done;
                return newDone;
              })}
            />
          ))
        ))}
      </View>
    </>
  ) : (
    <PagerView
      ref={pagerRef}
      key={`${readingLocation.version}-${readingLocation.book}`}
      style={{ flex: 1 }}
      initialPage={computeGlobalPage(readingLocation.chapter, readingLocation.page)}
      overdrag={true} // iOS
      overScrollMode="always" // Android
      onPageScroll={({ nativeEvent }) => {
        const { position, offset } = nativeEvent;
        if (position >= totalGlobalPages - 1 && offset > 0) {
          const currentBookIndex = bibleBooks.indexOf(readingLocation.book);
          if (currentBookIndex < bibleBooks.length - 1) {
            changeReadingLocation({ ...readingLocation, book: bibleBooks[currentBookIndex + 1], chapter: 1, page: 0 });
          }
        }
        if (position < 0 && offset > 0) {
          const currentBookIndex = bibleBooks.indexOf(readingLocation.book);
          if (currentBookIndex > 0) {
            const prevBook = bibleBooks[currentBookIndex - 1];
            const prevBookChapterCount = getBibleBookChapterCount(prevBook);
            changeReadingLocation({ ...readingLocation, book: prevBook, chapter: prevBookChapterCount, page: -1 });
          }
        }
      }}
      onPageSelected={({ nativeEvent: { position } }) => {
        const { chapter, localPage } = computeChapterAndLocalPage(position);
        setCurrentChapter(chapter);
        setCurrentLocalPage(localPage);
        changeReadingLocation({ ...readingLocation, chapter, page: localPage });
      }}
    >
      {bookVerses.map((verses, chIdx) => {
        const chapter = chIdx + 1;
        return [
          <ChapterSummary
            key={`summary-${chapter}`}
            version={readingLocation.version}
            book={readingLocation.book}
            chapter={chapter}
          />,
          ...chapterPageStarts[chIdx].map((start, pageIdx) => (
            <Page
              key={`page-${chapter}-${pageIdx}`}
              chapter={chapter}
              page={pageIdx + 1}
              verses={verses.slice(start, chapterPageStarts[chIdx][pageIdx + 1] || verses.length)}
              onContextMenu={onContextMenu}
            />
          )),
        ];
      }).flat()}
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
  chapter: number;
  start: number;
  verses: Verse[];
  isLast: boolean;
  onContextMenu: (verse: Verse) => void;
  addNextPage: (chapter: number, nextStart: number) => void;
  setChapterDone: (done: boolean) => void;
};

function MeasuredPage({ chapter, start, verses, isLast, onContextMenu, addNextPage, setChapterDone }: MeasuredPageProps) {
  const [viewableCount, setViewableCount] = useState(0);
  const verseNumberColor = useThemeColor({}, "verseNumber");

  useEffect(() => {
    if (isLast && viewableCount > 0 && start + viewableCount < verses.length) {
      addNextPage(chapter, start + viewableCount);
    }
  }, [viewableCount, isLast, start, verses.length, chapter, addNextPage]);

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
          minimumViewTime: 100,
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