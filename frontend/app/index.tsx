import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { PlatformPressable } from '@react-navigation/elements';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Stack, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import PagerView from 'react-native-pager-view';

import { CenteredActivityIndicator } from '@/components/ui/centered-activity-indicator';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VerseView } from '@/components/verse-view';
import BibleChapterSummary from './bible-chapter-summary';

import { getBibleBookChapterCount } from '@/utilities/get-bible-book-chapter-count';
import { getBibleBookList } from '@/utilities/get-bible-book-list';
import { getSupportedBibleVersions } from '@/utilities/get-bible-version-info';

import { useAppPreferences } from '@/hooks/use-app-preferences-provider';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useVerseContextMenu } from '@/hooks/use-verse-context-menu';
import { useChapterPages } from '@/hooks/use-chapter-pages';

import { Verse } from '@/types/verse';
import { UserPreferences } from '@/constants/user-preferences';

type ReadingLocation = {
  version: string;
  book: string;
  chapter: number;
  page: number;
};

export default function BibleBookReader() {
  const [loading, setLoading] = useState(true);
  const [readingLocation, setReadingLocation] = useState<ReadingLocation | null>(null);
  const [showReadingLocationPickerModal, setShowReadingLocationPickerModal] = useState(false);
  const { version, setVersion } = useAppPreferences();

  const isInitialMount = useRef(true);
  const router = useRouter();

  const modalBackgroundColor = useThemeColor({}, 'cardBackground');
  const modalPickerColor = useThemeColor({}, 'text');

  // Load user's reading location
  useEffect(() => {
    const loadReadingLocation = async () => {
      const defaultBibleBook = 'John';
      const defaultBibleChapter = 1;
      const defaultReaderPage = 0;
      try {
        const savedReadingLocation = await AsyncStorage.getItem(
          UserPreferences.saved_reading_location,
        );
        if (savedReadingLocation) {
          const readingLocation = JSON.parse(savedReadingLocation) as ReadingLocation;
          readingLocation.version = version;
          setReadingLocation(readingLocation);
        } else {
          setReadingLocation({
            version,
            book: defaultBibleBook,
            chapter: defaultBibleChapter,
            page: defaultReaderPage,
          });
        }
      } catch {
        setReadingLocation({
          version,
          book: defaultBibleBook,
          chapter: defaultBibleChapter,
          page: defaultReaderPage,
        });
      } finally {
        setLoading(false);
      }
    };

    loadReadingLocation();
  }, [version]);

  // Save user's reading location
  useEffect(() => {
    const saveReadingLocation = async () => {
      if (readingLocation && !isInitialMount.current) {
        try {
          await AsyncStorage.setItem(
            UserPreferences.saved_reading_location,
            JSON.stringify(readingLocation),
          );
        } catch {}
      }
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') saveReadingLocation(); // Save when app is placed in background
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
    setReadingLocation((prev) => ({ ...prev!, ...changed }));
  }, []);

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
            key="reading-location-picker-modal"
            isVisible={showReadingLocationPickerModal}
            backdropOpacity={0.05}
            onBackdropPress={() => setShowReadingLocationPickerModal(false)}
            onSwipeComplete={() => setShowReadingLocationPickerModal(false)}
            swipeDirection={['left', 'right']}
            animationIn="slideInDown"
            animationOut="slideOutUp">
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ padding: 16, width: '80%' }}>
                <Picker
                  style={{ opacity: 0.9 }}
                  selectedValue={version}
                  onValueChange={(version) => setVersion(version)}
                  itemStyle={{
                    borderRadius: 200,
                    color: modalPickerColor,
                    backgroundColor: modalBackgroundColor,
                    fontWeight: 'bold',
                    marginBottom: 30,
                  }}>
                  {getSupportedBibleVersions().map((version) => {
                    return (
                      <Picker.Item
                        key={version.key}
                        label={version.shortname}
                        value={version.key}
                      />
                    );
                  })}
                </Picker>
                <Picker
                  style={{ opacity: 0.9 }}
                  selectedValue={readingLocation.book}
                  onValueChange={(bk) => {
                    changeReadingLocation({ ...readingLocation, book: bk, chapter: 1, page: 0 });
                  }}
                  itemStyle={{
                    borderRadius: 200,
                    color: modalPickerColor,
                    backgroundColor: modalBackgroundColor,
                    fontWeight: 'bold',
                    marginBottom: 30,
                  }}>
                  {getBibleBookList().map((bk) => (
                    <Picker.Item key={bk} label={bk} value={bk} />
                  ))}
                </Picker>
                <Picker
                  style={{ opacity: 0.9 }}
                  selectedValue={readingLocation.chapter}
                  onValueChange={(ch) => {
                    changeReadingLocation({ ...readingLocation, chapter: ch, page: 0 });
                  }}
                  itemStyle={{
                    borderRadius: 200,
                    color: modalPickerColor,
                    backgroundColor: modalBackgroundColor,
                    fontWeight: 'bold',
                  }}>
                  {Array.from(
                    { length: getBibleBookChapterCount(readingLocation.book!) },
                    (_, i) => i + 1,
                  ).map((ch) => (
                    <Picker.Item key={ch} label={`Chapter ${ch}`} value={ch} />
                  ))}
                </Picker>
              </View>
            </View>
          </Modal>
        </>
      )}
      {loading && <CenteredActivityIndicator hint="Loading Book" size="large" />}
      {!loading && readingLocation && (
        <Pages
          key={`${readingLocation.version}-${readingLocation.book}`}
          readingLocation={readingLocation}
          changeReadingLocation={changeReadingLocation}
        />
      )}
    </>
  );
}

type PagesParams = {
  readingLocation: ReadingLocation;
  changeReadingLocation: (changed: Partial<ReadingLocation>) => void;
};

function Pages({ readingLocation, changeReadingLocation }: PagesParams) {
  const pagerRef = useRef<PagerView>(null);
  const { loading, pages, measureView } = useChapterPages(
    readingLocation.version,
    readingLocation.book,
    readingLocation.chapter,
  );

  const onContextMenu = useVerseContextMenu();

  const bibleBooks = getBibleBookList();

  return loading || !pages ? (
    <>
      <CenteredActivityIndicator hint="Loading Book" size="large" />
      {measureView}
    </>
  ) : (
    <PagerView
      ref={pagerRef}
      key={`${readingLocation.version}-${readingLocation.book}-${readingLocation.chapter}`}
      style={{ flex: 1 }}
      initialPage={readingLocation.page === -1 ? pages.length : readingLocation.page}
      overdrag={true} // iOS
      overScrollMode="always" // Android
      onPageScroll={({ nativeEvent: { position, offset } }) => {
        const chapterCount = getBibleBookChapterCount(readingLocation.book);
        if (position >= pages.length && offset > 0) {
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
      }}>
      <ChapterSummary
        key={`summary-${readingLocation.chapter}`}
        version={readingLocation.version}
        book={readingLocation.book}
        chapter={readingLocation.chapter}
      />
      {pages.map((page, pageIdx) => (
        <Page
          key={`page-${pageIdx}`}
          chapter={readingLocation.chapter}
          page={page.pageNumber}
          verses={page.verses}
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
  return <BibleChapterSummary version={version} book={book} chapter={chapter} />;
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
  const verseNumberColor = useThemeColor({}, 'verseNumber');

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

type VerseItemProps = {
  verse: Verse;
  verseNumberColor: string;
  onContextMenu: (verse: Verse) => void;
};

const VerseItem = memo(({ verse, verseNumberColor, onContextMenu }: VerseItemProps) => {
  return (
    <TouchableOpacity onLongPress={() => onContextMenu(verse)}>
      <VerseView verse={verse} verseNumberColor={verseNumberColor} />
    </TouchableOpacity>
  );
});
VerseItem.displayName = 'VerseItem';
