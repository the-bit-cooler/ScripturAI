import { router } from "expo-router";
import { useCallback } from "react";
import { useActionSheet } from "@expo/react-native-action-sheet";
import * as Clipboard from "expo-clipboard";
import { Share, Platform, Alert } from "react-native";

import { Verse } from "@/types/verse";

export function useVerseContextMenu() {
  const { showActionSheetWithOptions } = useActionSheet();

  const onContextMenu = useCallback((verse: Verse) => {
    // Build options dynamically
    const options = ["Similar Verses", "Simple Insight", "Deep Insight"];
    if (Platform.OS === "android") options.push("Copy");
    options.push("Share");

    showActionSheetWithOptions(
      { options, title: `Verse ${verse.verse}` },
      async (selectedIndex?: number) => {
        switch (options[selectedIndex!]) {
          case "Similar Verses":
            router.push({
              pathname: "/similar-verses",
              params: { version: verse.version, book: verse.book, chapter: verse.chapter, verse: verse.verse },
            });
            break;
          case "Simple Insight":
            router.push({
              pathname: "/verse-explanation",
              params: { version: verse.version, book: verse.book, chapter: verse.chapter, verse: verse.verse, mode: "simple", icon: "lightbulb.fill" },
            });
            break;
          case "Deep Insight":
            router.push({
              pathname: "/verse-explanation",
              params: { version: verse.version, book: verse.book, chapter: verse.chapter, verse: verse.verse, mode: "deep", icon: "book.fill" },
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