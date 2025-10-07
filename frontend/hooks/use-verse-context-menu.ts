import { useActionSheet } from "@expo/react-native-action-sheet";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useCallback } from "react";
import { Alert, Platform, Share } from "react-native";

import { Verse } from "@/types/verse";

export function useVerseContextMenu() {
  const { showActionSheetWithOptions } = useActionSheet();

  const onContextMenu = useCallback((verse: Verse) => {
    // Build options dynamically
    const options = ["Similar Verses", "Explain Verse"];
    if (Platform.OS === "android") options.push("Copy");
    options.push("Share");

    showActionSheetWithOptions(
      { options, title: `Verse ${verse.verse}` },
      async (selectedIndex?: number) => {
        switch (options[selectedIndex!]) {
          case "Similar Verses":
            router.push({
              pathname: "/similar-bible-verses",
              params: { version: verse.version, book: verse.book, chapter: verse.chapter, verse: verse.verse },
            });
            break;
          case "Explain Verse":
            router.push({
              pathname: "/bible-verse-explanation",
              params: { version: verse.version, book: verse.book, chapter: verse.chapter, verse: verse.verse },
            });
            break;
          case "Copy":
            await Clipboard.setStringAsync(`${verse.book} ${verse.chapter}:${verse.verse} — ${verse.text}`);
            Alert.alert("Copied!", "Verse copied to clipboard.");
            break;
          case "Share":
            try {
              await Share.share({ message: `${verse.book} ${verse.chapter}:${verse.verse} — ${verse.text}` });
            } catch (error) {
              console.error("Error sharing verse:", error);
            }
            break;
          default:
            break;
        }
      }
    );
  }, [showActionSheetWithOptions]);

  return { onContextMenu };
}