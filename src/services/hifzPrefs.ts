import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wirdak_hifz_prefs_v1';

/** وحدة الإخفاء: آية كاملة أو كلمة */
export type TouchHifzUnit = 'ayah' | 'word';

/** أسلوب الكشف */
export type TouchRevealMode = 'hold' | 'tap';

export type HifzPrefs = {
  touchUnit: TouchHifzUnit;
  touchRevealMode: TouchRevealMode;
};

const DEFAULT: HifzPrefs = {
  touchUnit: 'ayah',
  touchRevealMode: 'tap',
};

export async function getHifzPrefs(): Promise<HifzPrefs> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { ...DEFAULT };
  const parsed = JSON.parse(raw) as Partial<HifzPrefs>;
  return {
    touchUnit: parsed.touchUnit === 'word' ? 'word' : DEFAULT.touchUnit,
    touchRevealMode: parsed.touchRevealMode === 'hold' ? 'hold' : DEFAULT.touchRevealMode,
  };
}

export async function setHifzPrefs(patch: Partial<HifzPrefs>): Promise<HifzPrefs> {
  const next = { ...(await getHifzPrefs()), ...patch };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
