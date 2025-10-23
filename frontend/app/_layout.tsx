import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppThemeProvider } from '@/hooks/use-app-theme-provider';
import { AppPreferencesProvider } from '@/hooks/use-app-preferences-provider';

export default function RootLayout() {
  return (
    <ActionSheetProvider>
      <AppPreferencesProvider>
        <AppThemeProvider>
          <Stack>
            <Stack.Screen
              name="index"
              options={{
                title: 'Bible',
              }}
            />
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
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="similar-bible-verses"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="bible-verse-versions"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
          </Stack>
          <StatusBar style="auto" />
        </AppThemeProvider>
      </AppPreferencesProvider>
    </ActionSheetProvider>
  );
}
