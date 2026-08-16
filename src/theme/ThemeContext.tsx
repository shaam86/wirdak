import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/cairo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeColors } from './colors';
import { AppPaletteId, resolvePaletteColors } from './palettes';
import { type as fontType } from './tokens';
import { getAppPrefs, setAppPrefs } from '../services/appPrefs';

const THEME_KEY = 'settings_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  fonts: typeof fontType;
  setMode: (mode: ThemeMode) => void;
  palette: AppPaletteId;
  setPalette: (p: AppPaletteId) => void;
  elderMode: boolean;
  setElderMode: (v: boolean) => void;
  /** مضاعف حجم للواجهات في وضع كبار السن */
  uiScale: number;
  /** تحجيم رقم مع تقريب مناسب للنص */
  scale: (n: number) => number;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [palette, setPaletteState] = useState<AppPaletteId>('emerald');
  const [elderMode, setElderModeState] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
    AmiriQuran: require('../../assets/fonts/AmiriQuran-Regular.ttf'),
  });
  const [fontsTimedOut, setFontsTimedOut] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(THEME_KEY), getAppPrefs()]).then(([saved, prefs]) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
      setPaletteState(prefs.palette);
      setElderModeState(prefs.elderMode);
      setThemeReady(true);
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded) return;
    const id = setTimeout(() => setFontsTimedOut(true), 2500);
    return () => clearTimeout(id);
  }, [fontsLoaded]);

  async function setMode(next: ThemeMode) {
    setModeState(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  }

  async function setPalette(next: AppPaletteId) {
    setPaletteState(next);
    await setAppPrefs({ palette: next });
  }

  async function setElderMode(next: boolean) {
    setElderModeState(next);
    await setAppPrefs({ elderMode: next });
  }

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors = resolvePaletteColors(palette, isDark);
  const uiScale = elderMode ? 1.22 : 1;
  const scale = (n: number) => Math.round(n * uiScale);

  const value = useMemo(
    () => ({
      mode,
      isDark,
      colors,
      fonts: fontType,
      setMode,
      palette,
      setPalette,
      elderMode,
      setElderMode,
      uiScale,
      scale,
    }),
    [mode, isDark, colors, palette, elderMode, uiScale]
  );

  if (!themeReady || (!fontsLoaded && !fontsTimedOut)) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
