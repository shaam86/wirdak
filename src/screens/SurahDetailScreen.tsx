import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useFonts } from 'expo-font';
import { AyahShareCard } from '../components/AyahShareCard';
import { AyahActionMenu } from '../components/AyahActionMenu';
import { ErrorView } from '../components/ErrorView';
import { LoadingView } from '../components/LoadingView';
import { MushafReader } from '../components/MushafReader';
import { ReadingControls } from '../components/ReadingControls';
import { SurahAudioPlayer } from '../components/SurahAudioPlayer';
import { TextSheet } from '../components/TextSheet';
import { getJuzForAyah } from '../data/juz';
import { QuranStackParamList } from '../navigation/types';
import { useI18n } from '../i18n/LanguageContext';
import { recordActivity, recordQuranMinutes } from '../services/activityStore';
import { learnPreferredHour } from '../services/appPrefs';
import { claimAudioFocus } from '../services/audioCoordinator';
import { addBookmark } from '../services/bookmarks';
import {
  getKhatmahById,
  saveIndexReadingPosition,
  updateKhatmahPosition,
} from '../services/khatmahStore';
import {
  Ayah,
  fetchSurahWithSource,
  getAudioUrl,
  SurahDetail,
  type SurahLoadSource,
} from '../services/quranApi';
import { getReadingPrefs, ReadingPrefs, resolveFontFamily, setReadingPrefs } from '../services/readingPrefs';
import { configureBackgroundAudio } from '../services/surahAudio';
import { fetchIbnKathirTafsir } from '../services/tafsir';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  route: RouteProp<QuranStackParamList, 'SurahDetail'>;
};

export function SurahDetailScreen({ route }: Props) {
  const { colors, isDark, elderMode, uiScale, scale, fonts } = useTheme();
  const { t } = useI18n();
  const { surahNumber, surahName, startAyah, autoPlay, khatmahId, highlightAyah } = route.params;
  const isKhatmahMode = !!khatmahId;
  const focusAyah = highlightAyah ?? startAyah;
  const [fontsLoaded] = useFonts({
    AmiriQuran: require('../../assets/fonts/AmiriQuran-Regular.ttf'),
  });

  const [surah, setSurah] = useState<SurahDetail | null>(null);
  const [loadSource, setLoadSource] = useState<SurahLoadSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAyah, setCurrentAyah] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [menuAyah, setMenuAyah] = useState<Ayah | null>(null);
  const [showPlayer, setShowPlayer] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [prefs, setPrefs] = useState<ReadingPrefs>({
    fontSize: 26,
    fontFamily: 'uthmani',
    viewMode: 'mushaf',
    showTranslationInline: false,
  });
  const [shareCardAyah, setShareCardAyah] = useState<Ayah | null>(null);
  const openedAtRef = useRef(Date.now());
  const [khatmahName, setKhatmahName] = useState<string | null>(null);
  const listRef = useRef<FlatList<Ayah>>(null);
  const [sheet, setSheet] = useState<{
    title: string;
    subtitle?: string;
    body?: string;
    loading?: boolean;
    rtl?: boolean;
  } | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const surahRef = useRef<SurahDetail | null>(null);
  const currentAyahRef = useRef<number | null>(null);
  const stopRequestedRef = useRef(false);
  const startedRef = useRef(false);

  /** فهرس فقط — لا يمسّ جدول الختمات */
  const persistIndexPosition = useCallback(
    async (ayahNumber: number) => {
      if (isKhatmahMode) return;
      await saveIndexReadingPosition(surahNumber, ayahNumber);
    },
    [isKhatmahMode, surahNumber]
  );

  const loadSurah = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { surah: data, source } = await fetchSurahWithSource(surahNumber);
      setSurah(data);
      setLoadSource(source);
      surahRef.current = data;
    } catch {
      setError(t('hifz.surahLoadError'));
    } finally {
      setLoading(false);
    }
  }, [surahNumber, t]);

  useEffect(() => {
    loadSurah();
  }, [loadSurah]);

  useFocusEffect(
    useCallback(() => {
      openedAtRef.current = Date.now();
      getReadingPrefs().then(setPrefs);
      recordActivity('quran').catch(() => undefined);
      learnPreferredHour(new Date().getHours()).catch(() => undefined);
      return () => {
        const mins = Math.max(1, Math.round((Date.now() - openedAtRef.current) / 60000));
        recordQuranMinutes(mins).catch(() => undefined);
      };
    }, [])
  );

  const showAsList = prefs.viewMode === 'list' || !!focusAyah;

  const scrollToFocusAyah = useCallback((ayahNumber: number) => {
    const index = Math.max(0, ayahNumber - 1);
    const tryScroll = (attempt: number) => {
      try {
        listRef.current?.scrollToIndex({
          index,
          animated: attempt === 0,
          viewPosition: 0.2,
        });
      } catch {
        if (attempt < 4) {
          setTimeout(() => tryScroll(attempt + 1), 180 * (attempt + 1));
        } else {
          listRef.current?.scrollToOffset({ offset: Math.max(0, index * 120), animated: true });
        }
      }
    };
    setTimeout(() => tryScroll(0), 120);
  }, []);

  /** من البحث أو العلامات: ركّز الآية ومرّر إليها */
  useEffect(() => {
    if (!surah || !focusAyah) return;
    const ayah = surah.ayahs.find((a) => a.numberInSurah === focusAyah);
    if (!ayah) return;
    setCurrentAyah(focusAyah);
    if (highlightAyah) setMenuAyah(ayah);
    scrollToFocusAyah(focusAyah);
  }, [surah, focusAyah, highlightAyah, surahNumber, scrollToFocusAyah]);

  useEffect(() => {
    if (!khatmahId) {
      setKhatmahName(null);
      return;
    }
    getKhatmahById(khatmahId).then((k) => setKhatmahName(k?.khatmah_name ?? null));
  }, [khatmahId]);

  useEffect(() => {
    configureBackgroundAudio().catch(() => undefined);
    return () => {
      stopRequestedRef.current = true;
      soundRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (currentAyah != null && !isKhatmahMode) {
      persistIndexPosition(currentAyah);
    }
  }, [currentAyah, isKhatmahMode, persistIndexPosition]);

  async function saveKhatmahCheckpoint() {
    if (!khatmahId || currentAyah == null) return;
    await updateKhatmahPosition(khatmahId, surahNumber, currentAyah);
    Alert.alert('تم الحفظ', 'تحدّث موضع هذه الختمة فقط — فهرس القراءة لم يتأثر.');
  }

  async function unloadSound() {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {
        // ignore
      }
      soundRef.current = null;
    }
  }

  async function playAyahContinuous(ayahNumber: number) {
    const data = surahRef.current;
    if (!data) return;

    stopRequestedRef.current = false;
    currentAyahRef.current = ayahNumber;
    setCurrentAyah(ayahNumber);
    setIsPlaying(true);
    setIsPaused(false);

    await claimAudioFocus(async () => {
      stopRequestedRef.current = true;
      await unloadSound();
      setIsPlaying(false);
      setIsPaused(false);
    });
    await unloadSound();

    try {
      const uri = await getAudioUrl(surahNumber, ayahNumber);
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish && !stopRequestedRef.current) {
          const next = (currentAyahRef.current ?? ayahNumber) + 1;
          const max = data.ayahs.length;
          if (next <= max) {
            await playAyahContinuous(next);
          } else {
            setIsPlaying(false);
            setIsPaused(false);
            await unloadSound();
          }
        }
      });
    } catch {
      const next = ayahNumber + 1;
      if (next <= data.ayahs.length && !stopRequestedRef.current) {
        await playAyahContinuous(next);
      } else {
        setIsPlaying(false);
      }
    }
  }

  useEffect(() => {
    if (!surah) return;
    startedRef.current = false;
  }, [surahNumber, startAyah, highlightAyah]);

  useEffect(() => {
    if (!surah || startedRef.current) return;
    const ayah = startAyah && startAyah > 0 ? startAyah : 1;
    setCurrentAyah(ayah);
    startedRef.current = true;
    if (autoPlay && startAyah && startAyah > 0) {
      playAyahContinuous(ayah);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah, startAyah, highlightAyah]);

  async function stopAyahPlayback() {
    stopRequestedRef.current = true;
    if (currentAyahRef.current && !isKhatmahMode) {
      await persistIndexPosition(currentAyahRef.current);
    }
    await unloadSound();
    setIsPlaying(false);
    setIsPaused(false);
  }

  async function openTafsir(ayah: Ayah) {
    setMenuAyah(null);
    setSheet({
      title: 'تفسير ابن كثير',
      subtitle: `${surahName} — آية ${ayah.numberInSurah}`,
      loading: true,
      rtl: true,
    });
    try {
      const result = await fetchIbnKathirTafsir(surahNumber, ayah.numberInSurah);
      setSheet({
        title: 'تفسير ابن كثير',
        subtitle: `${surahName} — آية ${ayah.numberInSurah}`,
        body: result.text,
        rtl: result.language === 'ar',
      });
    } catch (e) {
      setSheet({
        title: 'تفسير ابن كثير',
        subtitle: `${surahName} — آية ${ayah.numberInSurah}`,
        body: e instanceof Error ? e.message : t('hifz.tafsirLoadError'),
        rtl: true,
      });
    }
  }

  function openTranslation(ayah: Ayah) {
    setMenuAyah(null);
    setSheet({
      title: 'الترجمة',
      subtitle: `${surahName} — آية ${ayah.numberInSurah}`,
      body: ayah.translation || 'لا تتوفر ترجمة لهذه الآية حالياً.',
      rtl: false,
    });
  }

  async function onBookmark(ayah: Ayah) {
    setMenuAyah(null);
    await addBookmark({
      surahNumber,
      surahName,
      ayahNumber: ayah.numberInSurah,
      text: ayah.text,
    });
    Alert.alert('تمت الإضافة', 'تم حفظ الآية في العلامات المرجعية.');
  }

  async function onShare(ayah: Ayah) {
    setMenuAyah(null);
    setShareCardAyah(ayah);
  }

  const juzNumber = useMemo(() => {
    if (!surah?.ayahs.length) return getJuzForAyah(surahNumber, 1);
    const focus = currentAyah ?? startAyah ?? 1;
    const ayah = surah.ayahs.find((a) => a.numberInSurah === focus) ?? surah.ayahs[0];
    return ayah.juz ?? getJuzForAyah(surahNumber, ayah.numberInSurah);
  }, [surah, currentAyah, startAyah, surahNumber]);

  const pageNumber = useMemo(() => {
    if (!surah?.ayahs.length) return undefined;
    const focus = selectedPageAyah(surah, menuAyah?.numberInSurah ?? currentAyah ?? 1);
    return focus?.page;
  }, [surah, menuAyah, currentAyah]);

  const surahPages = useMemo(() => {
    if (!surah?.ayahs.length) return [] as number[];
    const set = new Set<number>();
    for (const a of surah.ayahs) {
      if (a.page != null) set.add(a.page);
    }
    return [...set].sort((a, b) => a - b);
  }, [surah]);

  const [mushafPageCursor, setMushafPageCursor] = useState<number | null>(null);

  useEffect(() => {
    if (!surahPages.length) {
      setMushafPageCursor(null);
      return;
    }
    const preferred = pageNumber && surahPages.includes(pageNumber) ? pageNumber : surahPages[0];
    setMushafPageCursor(preferred);
  }, [surahNumber, surahPages, pageNumber]);

  const mushafPageAyahs = useMemo(() => {
    if (!surah?.ayahs.length) return [];
    if (mushafPageCursor == null || !surahPages.length) return surah.ayahs;
    const filtered = surah.ayahs.filter((a) => a.page === mushafPageCursor);
    return filtered.length ? filtered : surah.ayahs;
  }, [surah, mushafPageCursor, surahPages]);

  const mushafPageIdx = mushafPageCursor != null ? surahPages.indexOf(mushafPageCursor) : -1;

  if (!fontsLoaded || loading) return <LoadingView message={t('hifz.preparingMushaf')} />;
  if (error) return <ErrorView message={error} />;
  if (!surah) return null;

  const barBg = isDark ? colors.surface : '#F4EFE3';
  const barBorder = isDark ? colors.border : '#E8D9C0';
  const listFontSize = Math.round(prefs.fontSize * (elderMode ? uiScale : 1));
  const listFontFamily = resolveFontFamily(prefs.fontFamily);
  const activeListAyah = menuAyah?.numberInSurah ?? currentAyah ?? focusAyah ?? null;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#EDE6D6' }]}>
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
      <View style={[styles.toolbar, { backgroundColor: barBg, borderBottomColor: barBorder }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolbarRow}
        >
          <TouchableOpacity
            onPress={() => setShowPlayer((v) => !v)}
            style={[styles.toolChip, showPlayer && styles.toolChipActive]}
          >
            <Text style={[styles.toolText, showPlayer && styles.toolTextActive]}>
              {showPlayer ? t('hifz.toolHideListen') : t('hifz.toolListen')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowControls((v) => !v)}
            style={[styles.toolChip, showControls && styles.toolChipActive]}
          >
            <Text style={[styles.toolText, showControls && styles.toolTextActive]}>
              {t('hifz.toolCustomize')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        <Text style={[styles.hint, { color: isDark ? colors.textSecondary : '#9A8770' }]} numberOfLines={1}>
          {isKhatmahMode
            ? t('hifz.hintKhatmah', { name: khatmahName ?? '…' })
            : t('hifz.hintDefault')}
        </Text>
      </View>

      {showControls ? (
        <ReadingControls
          prefs={prefs}
          onChange={async (patch) => setPrefs(await setReadingPrefs(patch))}
        />
      ) : null}

      {isKhatmahMode ? (
        <View style={[styles.khatmahBar, { backgroundColor: barBg }]}>
          <TouchableOpacity style={styles.khatmahSaveBtn} onPress={saveKhatmahCheckpoint}>
            <Text style={styles.khatmahSaveText}>
              تحديث موضع الختمة
              {currentAyah != null ? ` (آية ${currentAyah})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {showPlayer ? (
        <View style={[styles.playerWrap, { backgroundColor: barBg, borderBottomColor: barBorder }]}>
          <SurahAudioPlayer
            surahNumber={surahNumber}
            surahName={surahName}
            autoPlay={!!autoPlay && !startAyah}
            compact
          />
          {(isPlaying || isPaused) && (
            <TouchableOpacity style={styles.ayahStopBtn} onPress={stopAyahPlayback}>
              <Text style={styles.ayahStopText}>إيقاف قراءة الآية</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {showAsList ? (
        <FlatList
          ref={listRef}
          data={surah.ayahs}
          keyExtractor={(item) => String(item.numberInSurah)}
          contentContainerStyle={styles.listWrap}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.25,
              });
            }, 200);
          }}
          renderItem={({ item }) => {
            const isActive = activeListAyah === item.numberInSurah;
            return (
              <TouchableOpacity
                style={[
                  styles.listRow,
                  {
                    borderBottomColor: isDark ? colors.border : '#E8D9C0',
                    backgroundColor: isActive
                      ? isDark
                        ? colors.sand
                        : '#F0E6D2'
                      : 'transparent',
                  },
                ]}
                onPress={() => {
                  setMenuAyah(item);
                  setCurrentAyah(item.numberInSurah);
                }}
                onLongPress={() => {
                  setMenuAyah(item);
                  setCurrentAyah(item.numberInSurah);
                }}
              >
                <Text style={[styles.listNum, { color: colors.accent }]}>
                  {item.numberInSurah}
                </Text>
                <Text
                  style={[
                    styles.listText,
                    {
                      fontSize: listFontSize,
                      fontFamily: listFontFamily,
                      color: colors.text,
                    },
                  ]}
                >
                  {item.text}
                </Text>
                {prefs.showTranslationInline && item.translation ? (
                  <Text
                    style={[
                      styles.listTranslation,
                      { color: colors.textSecondary, fontSize: Math.round(listFontSize * 0.55) },
                    ]}
                  >
                    {item.translation}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {surahPages.length > 1 ? (
            <View
              style={[
                styles.pageNav,
                { backgroundColor: barBg, borderBottomColor: barBorder },
              ]}
            >
              <TouchableOpacity
                style={[styles.pageNavBtn, { opacity: mushafPageIdx <= 0 ? 0.35 : 1 }]}
                disabled={mushafPageIdx <= 0}
                onPress={() => {
                  if (mushafPageIdx > 0) setMushafPageCursor(surahPages[mushafPageIdx - 1]);
                }}
              >
                <Text style={[styles.pageNavText, { color: colors.primary }]}>{t('mushaf.prev')}</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.text, fontFamily: fonts.uiBold }}>
                {t('mushaf.pageInSurah', {
                  n: String(mushafPageCursor ?? pageNumber ?? '—'),
                })}
              </Text>
              <TouchableOpacity
                style={[
                  styles.pageNavBtn,
                  { opacity: mushafPageIdx < 0 || mushafPageIdx >= surahPages.length - 1 ? 0.35 : 1 },
                ]}
                disabled={mushafPageIdx < 0 || mushafPageIdx >= surahPages.length - 1}
                onPress={() => {
                  if (mushafPageIdx >= 0 && mushafPageIdx < surahPages.length - 1) {
                    setMushafPageCursor(surahPages[mushafPageIdx + 1]);
                  }
                }}
              >
                <Text style={[styles.pageNavText, { color: colors.primary }]}>{t('mushaf.next')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <MushafReader
            surahNumber={surahNumber}
            surahName={surahName}
            juzNumber={juzNumber}
            pageNumber={mushafPageCursor ?? pageNumber}
            ayahs={mushafPageAyahs}
            selectedAyah={menuAyah?.numberInSurah ?? null}
            playingAyah={isPlaying || isPaused ? currentAyah : null}
            fontSize={Math.round(prefs.fontSize * (elderMode ? uiScale : 1))}
            fontFamily={prefs.fontFamily}
            hifzMode={false}
            revealedCount={0}
            highlightAyah={highlightAyah}
            forceNight={prefs.viewMode === 'mushafNight'}
            onSelectAyah={(ayah) => {
              setMenuAyah(ayah);
              setCurrentAyah(ayah.numberInSurah);
            }}
          />
        </View>
      )}

      <AyahActionMenu
        visible={!!menuAyah}
        ayahNumber={menuAyah?.numberInSurah ?? 0}
        onClose={() => setMenuAyah(null)}
        onTafsir={() => menuAyah && openTafsir(menuAyah)}
        onTranslation={() => menuAyah && openTranslation(menuAyah)}
        onListen={() => {
          if (!menuAyah) return;
          const n = menuAyah.numberInSurah;
          setMenuAyah(null);
          playAyahContinuous(n);
        }}
        onBookmark={() => menuAyah && onBookmark(menuAyah)}
        onShare={() => menuAyah && onShare(menuAyah)}
      />

      <AyahShareCard
        visible={!!shareCardAyah}
        surahName={surahName}
        ayahNumber={shareCardAyah?.numberInSurah ?? 0}
        text={shareCardAyah?.text ?? ''}
        onClose={() => setShareCardAyah(null)}
      />

      <TextSheet
        visible={!!sheet}
        title={sheet?.title ?? ''}
        subtitle={sheet?.subtitle}
        body={sheet?.body}
        loading={sheet?.loading}
        rtl={sheet?.rtl}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

function selectedPageAyah(surah: SurahDetail, ayahNumber: number): Ayah | undefined {
  return surah.ayahs.find((a) => a.numberInSurah === ayahNumber) ?? surah.ayahs[0];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE6D6' },
  offlineBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  toolbar: {
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: '#F4EFE3',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D9C0',
  },
  toolbarRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  toolChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4B896',
    backgroundColor: '#FBF6EC',
    minHeight: 36,
    justifyContent: 'center',
  },
  toolChipActive: {
    backgroundColor: '#A67C52',
    borderColor: '#A67C52',
  },
  toolText: { fontSize: 12, fontWeight: '700', color: '#6E4F32' },
  toolTextActive: { color: '#fff' },
  hint: {
    fontSize: 11,
    color: '#9A8770',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  playerWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#F4EFE3',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D9C0',
  },
  ayahStopBtn: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ayahStopText: { color: '#9A8770', fontWeight: '600', fontSize: 12 },
  pageNav: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  pageNavBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  pageNavText: { fontWeight: '800', fontSize: 13 },
  khatmahBar: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: '#F4EFE3',
  },
  khatmahSaveBtn: {
    backgroundColor: '#0E5F63',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  khatmahSaveText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  listWrap: { paddingBottom: 40 },
  listRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listNum: { fontSize: 12, fontWeight: '800', textAlign: 'right', marginBottom: 6 },
  listText: { textAlign: 'right', writingDirection: 'rtl', lineHeight: 42 },
  listTranslation: { textAlign: 'left', marginTop: 8, lineHeight: 22 },
});
