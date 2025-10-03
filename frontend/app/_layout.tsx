import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';

import { AppThemeProvider } from '@/hooks/use-app-theme-provider';

export default function RootLayout() {
  return (
    <ActionSheetProvider>
      <AppThemeProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="book-picker" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal', title: 'Settings' }} />
          <Stack.Screen name="similar-verses" options={{ presentation: 'modal', title: 'Similar Verses' }} />
          <Stack.Screen name="verse-explanation" options={{ presentation: 'modal', title: 'Verse Explanation' }} />
        </Stack>
        <StatusBar style="auto" />
      </AppThemeProvider>
    </ActionSheetProvider>
  );
}
