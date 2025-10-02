import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Verse } from '@/types/verse';

export const fetchChapter = useCallback(async (version: string, book: string, chapter: number) => {
  const cacheKey = `${version}:${book}:${chapter}`;
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached) as Verse[];

  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_AZURE_FUNCTION_URL}${version}/${book}/${chapter}?code=${process.env.EXPO_PUBLIC_AZURE_FUNCTION_KEY}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const verses: Verse[] = await response.json();
    AsyncStorage.setItem(cacheKey, JSON.stringify(verses));
    return verses;
  } catch (err) {
    console.error(`Failed to fetch ${cacheKey}:`, err);
    return [];
  }
}, []);