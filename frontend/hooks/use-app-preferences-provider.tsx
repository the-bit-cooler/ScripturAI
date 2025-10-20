import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferences } from '@/constants/user-preferences';

import { AiModes } from '@/constants/ai-modes';

type AppPreferencesContextType = {
  aiMode: string;
  setAiMode: (mode: string) => Promise<void>;
  allowThinkingSound: boolean;
  setAllowThinkingSound: (value: boolean) => Promise<void>;
};

const AppPreferencesContext = createContext<AppPreferencesContextType>({
  aiMode: AiModes.devotional,
  setAiMode: async () => { },
  allowThinkingSound: true,
  setAllowThinkingSound: async () => { },
});

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [aiMode, setAiModeState] = useState(AiModes.devotional);
  const [allowThinkingSound, setAllowThinkingSoundState] = useState(true);

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

  const setAiMode = async (mode: string) => {
    setAiModeState(mode); // updates immediately
    await AsyncStorage.setItem(UserPreferences.ai_mode, mode);
  };

  const setAllowThinkingSound = async (value: boolean) => {
    setAllowThinkingSoundState(value); // updates immediately
    await AsyncStorage.setItem(UserPreferences.ai_thinking_sound, value ? "true" : "false");
  };

  return (
    <AppPreferencesContext.Provider value={{ aiMode, setAiMode, allowThinkingSound, setAllowThinkingSound }}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  return useContext(AppPreferencesContext);
}