import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferences } from '@/constants/user-preferences';

import { AiModes } from '@/constants/ai-modes';

type AppPreferencesContextType = {
  aiMode: string;
  setAiMode: (mode: string) => Promise<void>;
  allowThinkingSound: boolean;
  setAllowThinkingSound: (value: boolean) => Promise<void>;
  version: string;
  setVersion: (version: string) => Promise<void>;
};

const AppPreferencesContext = createContext<AppPreferencesContextType>({
  aiMode: AiModes.devotional, // default
  setAiMode: async () => { },
  allowThinkingSound: true, // default
  setAllowThinkingSound: async () => { },
  version: 'KJV', // default
  setVersion: async () => { },
});

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [aiMode, setAiModeState] = useState(AiModes.devotional);  // default
  const [allowThinkingSound, setAllowThinkingSoundState] = useState(true);  // default
  const [version, setVersionState] = useState('KJV');  // default

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(UserPreferences.ai_mode);
      if (stored) setAiModeState(stored);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(UserPreferences.ai_thinking_sound);
      if (stored) setAllowThinkingSoundState(stored === "true");
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(UserPreferences.bible_version);
      if (stored) setVersionState(stored);
    })();
  }, []);

  const setAiMode = async (mode: string) => {
    setAiModeState(mode); // updates immediately
    await AsyncStorage.setItem(UserPreferences.ai_mode, mode);
  };

  const setAllowThinkingSound = async (value: boolean) => {
    setAllowThinkingSoundState(value); // updates immediately
    await AsyncStorage.setItem(UserPreferences.ai_thinking_sound, value ? "true" : "false");
  };

  const setVersion = async (version: string) => {
    setVersionState(version); // updates immediately
    await AsyncStorage.setItem(UserPreferences.bible_version, version);
  };

  return (
    <AppPreferencesContext.Provider value={{ aiMode, setAiMode, allowThinkingSound, setAllowThinkingSound, version, setVersion }}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  return useContext(AppPreferencesContext);
}