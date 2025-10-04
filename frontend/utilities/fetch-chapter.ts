import { Verse } from '@/types/verse';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function fetchChapter(version: string, book: string, chapter: number): Promise<Verse[]> {
  const url = `${process.env.EXPO_PUBLIC_AZURE_FUNCTION_URL}${version}/${book}/${chapter}?code=${process.env.EXPO_PUBLIC_AZURE_FUNCTION_KEY}`;
  const cacheKey = `${version}:${book}:${chapter}`;
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached) as Verse[];

  const response = await fetch(url);
  if (!response.ok) throw new Error(`API Error ${response.status}: Failed to fetch ${cacheKey}.`);

  const verses: Verse[] = await response.json();

  try {
    AsyncStorage.setItem(cacheKey, JSON.stringify(verses));
  } catch (err) {
    console.error(`Failed to cache ${cacheKey}:`, err);
  }

  return verses;
}