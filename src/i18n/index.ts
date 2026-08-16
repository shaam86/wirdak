import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { I18n, TranslateOptions } from 'i18n-js';
import { I18nManager, Platform } from 'react-native';
import ar from './locales/ar';
import en from './locales/en';
import tr from './locales/tr';

export type AppLanguage = 'ar' | 'en' | 'tr';

export const LANG_STORAGE_KEY = 'settings_language';

export const APP_LANGUAGES: { id: AppLanguage; nativeLabel: string }[] = [
  { id: 'ar', nativeLabel: 'العربية' },
  { id: 'en', nativeLabel: 'English' },
  { id: 'tr', nativeLabel: 'Türkçe' },
];

const i18n = new I18n({ ar, en, tr });
i18n.enableFallback = true;
i18n.defaultLocale = 'ar';
i18n.locale = 'ar';

export function detectDeviceLanguage(): AppLanguage {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase() ?? 'ar';
    if (code.startsWith('tr')) return 'tr';
    if (code.startsWith('en')) return 'en';
    if (code.startsWith('ar')) return 'ar';
  } catch {
    // ignore
  }
  return 'ar';
}

export async function getStoredLanguage(): Promise<AppLanguage> {
  const saved = await AsyncStorage.getItem(LANG_STORAGE_KEY);
  if (saved === 'en' || saved === 'tr' || saved === 'ar') return saved;
  return detectDeviceLanguage();
}

export function isRtlLanguage(lang: AppLanguage): boolean {
  return lang === 'ar';
}

export function localeTag(lang: AppLanguage): string {
  switch (lang) {
    case 'en':
      return 'en-US';
    case 'tr':
      return 'tr-TR';
    default:
      return 'ar-SA';
  }
}

export function setI18nLocale(lang: AppLanguage): void {
  i18n.locale = lang;
}

export function t(key: string, options?: TranslateOptions): string {
  return i18n.t(key, options);
}

/**
 * يطبّق اتجاه الكتابة. يعيد true إذا تغيّر الاتجاه ويحتاج إعادة تحميل.
 * على الويب نتخطى I18nManager لتجنب أعطال الشاشة السوداء.
 */
export function applyRtl(lang: AppLanguage): boolean {
  if (Platform.OS === 'web') return false;
  try {
    const wantRtl = isRtlLanguage(lang);
    I18nManager.allowRTL(true);
    const needsReload = I18nManager.isRTL !== wantRtl;
    if (needsReload) {
      I18nManager.forceRTL(wantRtl);
    }
    return needsReload;
  } catch {
    return false;
  }
}

export { i18n };
