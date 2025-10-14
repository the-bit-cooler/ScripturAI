import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';

import { AppThemeProvider } from '@/hooks/use-app-theme-provider';

export default function RootLayout() {
  return (
    <ActionSheetProvider>
      <AppThemeProvider>
        <Stack>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="settings"
            options={{
              title: 'Settings',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="bible-verse-explanation"
            options={{
              presentation: 'modal',
              headerShown: false
            }}
          />
          <Stack.Screen
            name="similar-bible-verses"
            options={{
              presentation: 'modal',
              headerShown: false
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </AppThemeProvider>
    </ActionSheetProvider>
  );
}
