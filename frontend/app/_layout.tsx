import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';

import { AppThemeProvider } from '@/hooks/use-app-theme-provider';

export default function RootLayout() {
  return (
    <ActionSheetProvider>
      <AppThemeProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="bible-book-picker" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal', title: 'Settings' }} />
          <Stack.Screen name="similar-bible-verses" options={{ presentation: 'modal', title: 'Similar Verses' }} />
          <Stack.Screen name="bible-verse-explanation" options={{ presentation: 'modal', title: 'Verse Explanation' }} />
          <Stack.Screen name="bible-chapter-summary" options={{ presentation: 'modal', title: 'Chapter Summary' }} />
        </Stack>
        <StatusBar style="auto" />
      </AppThemeProvider>
    </ActionSheetProvider>
  );
}
