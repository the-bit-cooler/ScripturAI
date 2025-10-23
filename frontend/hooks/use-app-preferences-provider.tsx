import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferences } from '@/constants/user-preferences';

import { AppDefaults } from '@/constants/app-defaults';

type AppPreferencesContextType = {
  version: string;
  setVersion: (version: string) => Promise<void>;
  aiMode: string;
  setAiMode: (mode: string) => Promise<void>;
  allowThinkingSound: boolean;
  setAllowThinkingSound: (value: boolean) => Promise<void>;
};

const AppPreferencesContext = createContext<AppPreferencesContextType>({
  version: AppDefaults.version,
  setVersion: async () => {},
  aiMode: AppDefaults.aiMode,
  setAiMode: async () => {},
  allowThinkingSound: AppDefaults.allowAiThinkingSound,
  setAllowThinkingSound: async () => {},
});

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersionState] = useState(AppDefaults.version);
  const [aiMode, setAiModeState] = useState(AppDefaults.aiMode);
  const [allowThinkingSound, setAllowThinkingSoundState] = useState(
    AppDefaults.allowAiThinkingSound,
  );

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(UserPreferences.bible_version);
      if (stored) setVersionState(stored);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(UserPreferences.ai_mode);
      if (stored) setAiModeState(stored);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(UserPreferences.ai_thinking_sound);
      if (stored) setAllowThinkingSoundState(stored === 'true');
    })();
  }, []);

  const setVersion = async (version: string) => {
    setVersionState(version); // updates immediately
    await AsyncStorage.setItem(UserPreferences.bible_version, version);
  };

  const setAiMode = async (mode: string) => {
    setAiModeState(mode); // updates immediately
    await AsyncStorage.setItem(UserPreferences.ai_mode, mode);
  };

  const setAllowThinkingSound = async (value: boolean) => {
    setAllowThinkingSoundState(value); // updates immediately
    await AsyncStorage.setItem(UserPreferences.ai_thinking_sound, value ? 'true' : 'false');
  };

  return (
    <AppPreferencesContext.Provider
      value={{ aiMode, setAiMode, allowThinkingSound, setAllowThinkingSound, version, setVersion }}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  return useContext(AppPreferencesContext);
}
