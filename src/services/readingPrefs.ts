import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wirdak_reading_prefs_v1';

export type ReadingFontFamily = 'uthmani' | 'amiri' | 'simple';
export type MushafViewMode = 'mushaf' | 'list' | 'mushafNight';

export type ReadingPrefs = {
  fontSize: number;
  fontFamily: ReadingFontFamily;
  viewMode: MushafViewMode;
  showTranslationInline: boolean;
};

export const FONT_FAMILY_LABELS: Record<ReadingFontFamily, string> = {
  uthmani: 'رسم عثماني',
  amiri: 'أميري قرآن',
  simple: 'خط واضح',
};

export const VIEW_MODE_LABELS: Record<MushafViewMode, string> = {
  mushaf: 'صفحة مصحف',
  list: 'قائمة آيات',
  mushafNight: 'مصحف ليلي',
};

const DEFAULT: ReadingPrefs = {
  fontSize: 26,
  fontFamily: 'uthmani',
  viewMode: 'mushaf',
  showTranslationInline: false,
};

export async function getReadingPrefs(): Promise<ReadingPrefs> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { ...DEFAULT };
  return { ...DEFAULT, ...(JSON.parse(raw) as ReadingPrefs) };
}

export async function setReadingPrefs(patch: Partial<ReadingPrefs>): Promise<ReadingPrefs> {
  const current = await getReadingPrefs();
  const next: ReadingPrefs = {
    ...current,
    ...patch,
    fontSize: Math.max(16, Math.min(48, patch.fontSize ?? current.fontSize)),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function resolveFontFamily(family: ReadingFontFamily): string | undefined {
  if (family === 'amiri' || family === 'uthmani') return 'AmiriQuran';
  return undefined;
}
