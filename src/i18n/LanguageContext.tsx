import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert, DevSettings } from 'react-native';
import {
  AppLanguage,
  applyRtl,
  detectDeviceLanguage,
  isRtlLanguage,
  LANG_STORAGE_KEY,
  localeTag,
  setI18nLocale,
  t as translate,
} from './index';

type TranslateOptions = Record<string, string | number>;

type LanguageContextValue = {
  language: AppLanguage;
  isRTL: boolean;
  ready: boolean;
  locale: string;
  textAlign: 'left' | 'right';
  writingDirection: 'ltr' | 'rtl';
  t: (key: string, options?: TranslateOptions) => string;
  setLanguage: (lang: AppLanguage) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function reloadApp() {
  try {
    if (typeof DevSettings?.reload === 'function') {
      DevSettings.reload();
    }
  } catch {
    // المستخدم قد يحتاج إعادة فتح التطبيق يدوياً
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('ar');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANG_STORAGE_KEY);
        const lang: AppLanguage =
          saved === 'en' || saved === 'tr' || saved === 'ar'
            ? saved
            : detectDeviceLanguage();
        setI18nLocale(lang);
        setLanguageState(lang);
        applyRtl(lang);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: AppLanguage) => {
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
    setI18nLocale(lang);
    setLanguageState(lang);
    const needsReload = applyRtl(lang);

    if (needsReload) {
      Alert.alert(
        translate('settings.languageChanged'),
        translate('settings.languageReload'),
        [
          {
            text: translate('common.done'),
            onPress: () => reloadApp(),
          },
        ]
      );
    }
  }, []);

  const t = useCallback(
    (key: string, options?: TranslateOptions) => translate(key, options),
    // re-bind when language changes so components re-render with new strings
    [language]
  );

  const isRTL = isRtlLanguage(language);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isRTL,
      ready,
      locale: localeTag(language),
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
      t,
      setLanguage,
    }),
    [language, isRTL, ready, t, setLanguage]
  );

  if (!ready) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider');
  return ctx;
}

export { getStoredLanguage } from './index';
