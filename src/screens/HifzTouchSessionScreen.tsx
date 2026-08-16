import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { ErrorView } from '../components/ErrorView';
import { LoadingView } from '../components/LoadingView';
import { TouchRecitationBoard } from '../components/touchRecitation/TouchRecitationBoard';
import { TouchRecitationPanel } from '../components/touchRecitation/TouchRecitationPanel';
import { useTouchRecitation } from '../hooks/useTouchRecitation';
import { useI18n } from '../i18n/LanguageContext';
import { HomeStackParamList } from '../navigation/types';
import { recordActivity } from '../services/activityStore';
import { getHifzPrefs, setHifzPrefs } from '../services/hifzPrefs';
import {
  fetchSurahWithSource,
  type SurahDetail,
  type SurahLoadSource,
} from '../services/quranApi';
import { getReadingPrefs, resolveFontFamily, type ReadingFontFamily } from '../services/readingPrefs';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'HifzTouchSession'>;
  route: RouteProp<HomeStackParamList, 'HifzTouchSession'>;
};

export function HifzTouchSessionScreen({ route }: Props) {
  const { colors, isDark, elderMode, uiScale, scale, fonts } = useTheme();
  const { t } = useI18n();
  const { surahNumber, surahName, startAyah } = route.params;

  const [fontsLoaded] = useFonts({
    AmiriQuran: require('../../assets/fonts/AmiriQuran-Regular.ttf'),
  });
  const [surah, setSurah] = useState<SurahDetail | null>(null);
  const [loadSource, setLoadSource] = useState<SurahLoadSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(26);
  const [fontFamily, setFontFamily] = useState<ReadingFontFamily>('uthmani');
  const [prefsReady, setPrefsReady] = useState(false);
  const [unitPref, setUnitPref] = useState<'ayah' | 'word'>('ayah');
  const [revealPref, setRevealPref] = useState<'hold' | 'tap'>('tap');
  const listRef = useRef<FlatList<{ number: number; numberInSurah: number; text: string }> | null>(
    null
  );

  useEffect(() => {
    recordActivity('quran').catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ surah: data, source }, reading, hifz] = await Promise.all([
          fetchSurahWithSource(surahNumber),
          getReadingPrefs(),
          getHifzPrefs(),
        ]);
        if (cancelled) return;
        setSurah(data);
        setLoadSource(source);
        setFontSize(reading.fontSize);
        setFontFamily(reading.fontFamily);
        setUnitPref(hifz.touchUnit);
        setRevealPref(hifz.touchRevealMode);
        setPrefsReady(true);
      } catch {
        if (!cancelled) setError(t('hifz.surahLoadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [surahNumber, t]);

  const touch = useTouchRecitation({
    ayahs: surah?.ayahs ?? [],
    initialEnabled: true,
    initialUnit: unitPref,
    initialRevealMode: revealPref,
  });

  useEffect(() => {
    if (!prefsReady) return;
    touch.enable(true);
    touch.changeUnit(unitPref);
    touch.changeRevealMode(revealPref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsReady, surahNumber]);

  useEffect(() => {
    if (!surah || !startAyah) return;
    const tmr = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: Math.max(0, startAyah - 1),
        animated: true,
        viewPosition: 0.2,
      });
    }, 350);
    return () => clearTimeout(tmr);
  }, [surah, startAyah]);

  const onChangeUnit = useCallback(
    (u: 'ayah' | 'word') => {
      touch.changeUnit(u);
      void setHifzPrefs({ touchUnit: u });
    },
    [touch]
  );

  const onChangeReveal = useCallback(
    (m: 'hold' | 'tap') => {
      touch.changeRevealMode(m);
      void setHifzPrefs({ touchRevealMode: m });
    },
    [touch]
  );

  if (!fontsLoaded || loading) return <LoadingView message={t('hifz.preparingMushaf')} />;
  if (error) return <ErrorView message={error} />;
  if (!surah) return null;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F7F1E6' }]}>
      {loadSource && loadSource !== 'network' ? (
        <View
          style={[
            styles.offlineBanner,
            { backgroundColor: colors.sand, borderBottomColor: colors.border },
          ]}
        >
          <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: scale(12) }}>
            {t('hifz.offlineBanner')}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.headerMeta,
          { borderBottomColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.uiBold,
            fontSize: scale(16),
            textAlign: 'center',
          }}
        >
          {surahName}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: scale(12),
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          {touch.revealMode === 'hold' ? t('hifz.hintHold') : t('hifz.hintTap')}
        </Text>
      </View>

      <TouchRecitationPanel
        enabled
        showToggle={false}
        onToggle={() => undefined}
        unit={touch.unit}
        onChangeUnit={onChangeUnit}
        revealMode={touch.revealMode}
        onChangeRevealMode={onChangeReveal}
        tapRevealed={touch.tapRevealed}
        totalUnits={touch.totalUnits}
        onReset={touch.resetMask}
      />

      <TouchRecitationBoard
        ref={listRef}
        ayahs={surah.ayahs}
        api={touch}
        fontSize={Math.round(fontSize * (elderMode ? uiScale : 1))}
        fontFamily={resolveFontFamily(fontFamily)}
        activeAyah={startAyah ?? null}
        contentBackground={isDark ? colors.background : '#F7F1E6'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  offlineBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerMeta: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
});
