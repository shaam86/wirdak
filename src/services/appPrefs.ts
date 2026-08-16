import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppPaletteId } from '../theme/palettes';

const KEY = 'wirdak_app_prefs_v1';

export type AdhanSoundId = 'default' | 'makkah' | 'madinah' | 'egypt';

export type AppPrefs = {
  palette: AppPaletteId;
  elderMode: boolean;
  /** ساعات مفضّلة للإشعارات الذكية (0–23) */
  preferredNotifHours: number[];
  adhanSoundId: AdhanSoundId;
  /** دقائق قراءة قرآن تقديرية تُسجَّل عند فتح السورة */
  trackQuranMinutes: boolean;
};

const DEFAULT: AppPrefs = {
  palette: 'emerald',
  elderMode: false,
  preferredNotifHours: [7, 12, 17, 21],
  adhanSoundId: 'makkah',
  trackQuranMinutes: true,
};

export const ADHAN_SOUNDS: {
  id: AdhanSoundId;
  label: string;
  /** رابط تجريبي للأذان (تشغيل داخل التطبيق) */
  url?: string;
}[] = [
  { id: 'default', label: 'صوت النظام الافتراضي' },
  {
    id: 'makkah',
    label: 'أذان مكة',
    url: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
  },
  {
    id: 'madinah',
    label: 'أذان المدينة',
    url: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
  },
  {
    id: 'egypt',
    label: 'أذان مصري',
    url: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
  },
];

export async function getAppPrefs(): Promise<AppPrefs> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { ...DEFAULT, preferredNotifHours: [...DEFAULT.preferredNotifHours] };
  return { ...DEFAULT, ...(JSON.parse(raw) as Partial<AppPrefs>) };
}

export async function setAppPrefs(patch: Partial<AppPrefs>): Promise<AppPrefs> {
  const current = await getAppPrefs();
  const next: AppPrefs = {
    ...current,
    ...patch,
    preferredNotifHours: patch.preferredNotifHours ?? current.preferredNotifHours,
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

/** يتعلّم أفضل ساعة من نشاط المستخدم */
export async function learnPreferredHour(hour: number): Promise<void> {
  const prefs = await getAppPrefs();
  const hours = [...prefs.preferredNotifHours];
  if (!hours.includes(hour)) {
    hours.push(hour);
    hours.sort((a, b) => a - b);
    while (hours.length > 6) hours.shift();
    await setAppPrefs({ preferredNotifHours: hours });
  }
}
