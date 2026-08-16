import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Icon } from '../components/Icon';
import { ReadingControls } from '../components/ReadingControls';
import { ShareButton } from '../components/ShareButton';
import { adhkarCategories, AdhkarCategory, DhikrItem } from '../data/adhkar';
import { useI18n } from '../i18n/LanguageContext';
import { AdhkarStackParamList } from '../navigation/types';
import { recordActivity } from '../services/activityStore';
import {
  clearAdhkarProgress,
  loadAdhkarProgress,
  saveAdhkarProgress,
} from '../services/adhkarProgress';
import { listCustomAdhkar, removeCustomDhikr } from '../services/customAdhkar';
import { refreshCustomAdhkarSearchCache } from '../services/searchEngine';
import {
  getReadingPrefs,
  ReadingPrefs,
  resolveFontFamily,
  setReadingPrefs,
} from '../services/readingPrefs';
import { shareDhikr } from '../services/smartShare';
import { useTheme } from '../theme/ThemeContext';
import { toEasternDigits } from '../utils/arabicNumerals';

type Props = {
  route: RouteProp<AdhkarStackParamList, 'AdhkarDetail'>;
};

function buildRemainingMap(items: DhikrItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) map[item.id] = item.count;
  return map;
}

function mergeProgress(
  items: DhikrItem[],
  saved: Record<string, number> | undefined
): Record<string, number> {
  const base = buildRemainingMap(items);
  if (!saved) return base;
  for (const item of items) {
    if (typeof saved[item.id] === 'number') {
      base[item.id] = Math.max(0, Math.min(item.count, saved[item.id]));
    }
  }
  return base;
}

export function AdhkarDetailScreen({ route }: Props) {
  const { colors, isDark, fonts } = useTheme();
  const { t } = useI18n();
  const { categoryId, focusItemId } = route.params;
  const [category, setCategory] = useState<AdhkarCategory | undefined>(() =>
    adhkarCategories.find((c) => c.id === categoryId)
  );

  const [index, setIndex] = useState(0);
  const [remainingMap, setRemainingMap] = useState<Record<string, number>>({});
  const [prefs, setPrefs] = useState<ReadingPrefs>({
    fontSize: 28,
    fontFamily: 'uthmani',
    viewMode: 'mushaf',
    showTranslationInline: false,
  });
  const [showControls, setShowControls] = useState(false);
  const [hifzMode, setHifzMode] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [finished, setFinished] = useState(false);
  const [ready, setReady] = useState(false);
  const advancingRef = useRef(false);
  const hifzModeRef = useRef(hifzMode);
  hifzModeRef.current = hifzMode;

  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;

  const reloadCategory = useCallback(async () => {
    if (categoryId === 'custom') {
      const rows = await listCustomAdhkar();
      setCategory({
        id: 'custom',
        title: t('adhkar.customTitleEn'),
        titleAr: t('adhkar.customTitle'),
        icon: '✏️',
        color: '#0E5F63',
        items: rows.map((r) => ({
          id: r.id,
          text: r.text,
          translation: r.translation,
          count: r.count,
          source: r.source,
        })),
      });
      return;
    }
    setCategory(adhkarCategories.find((c) => c.id === categoryId));
  }, [categoryId, t]);

  useFocusEffect(
    useCallback(() => {
      getReadingPrefs().then((p) =>
        setPrefs({ ...p, fontSize: Math.max(p.fontSize, 26), fontFamily: p.fontFamily || 'uthmani' })
      );
      reloadCategory();
    }, [reloadCategory])
  );

  // تحميل التقدّم اليومي — بدون إعادة ضبط عند تفعيل التسميع
  useEffect(() => {
    let cancelled = false;
    setReady(false);

    async function hydrate() {
      if (!category) return;
      const saved = await loadAdhkarProgress(categoryId);
      if (cancelled) return;

      const map = mergeProgress(category.items, saved?.remainingMap);
      setRemainingMap(map);

      let startIndex = 0;
      if (focusItemId) {
        const found = category.items.findIndex((i) => i.id === focusItemId);
        startIndex = found >= 0 ? found : 0;
      } else if (saved && category.items.length > 0) {
        startIndex = Math.max(0, Math.min(saved.index, category.items.length - 1));
      }
      setIndex(startIndex);
      setFinished(Boolean(saved?.finished) && !focusItemId);
      setRevealed(!hifzModeRef.current);
      advancingRef.current = false;
      fade.setValue(1);
      slide.setValue(0);
      setReady(true);
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [categoryId, focusItemId, category, fade, slide]);

  useEffect(() => {
    setRevealed(!hifzMode);
  }, [hifzMode]);

  useEffect(() => {
    if (!ready || !category) return;
    saveAdhkarProgress(categoryId, {
      remainingMap,
      index,
      finished,
    }).catch(() => undefined);
  }, [ready, category, categoryId, remainingMap, index, finished]);

  const items = category?.items ?? [];
  const current = items[index];
  const remaining = current ? remainingMap[current.id] ?? current.count : 0;

  const progress = useMemo(() => {
    if (!category) return 0;
    const total = category.items.reduce((s, i) => s + i.count, 0);
    if (!total) return 0;
    let done = 0;
    for (const item of category.items) {
      const left = remainingMap[item.id];
      const leftSafe = left == null ? item.count : left;
      done += item.count - leftSafe;
    }
    return Math.min(done / total, 1);
  }, [category, remainingMap]);

  function animateToIndex(nextIndex: number) {
    advancingRef.current = true;
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slide, { toValue: -28, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setIndex(nextIndex);
      setRevealed(!hifzModeRef.current);
      slide.setValue(28);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        advancingRef.current = false;
      });
    });
  }

  async function onTapCount() {
    if (!category || !current || finished || advancingRef.current) return;

    if (hifzMode && !revealed) {
      setRevealed(true);
      try {
        await Haptics.selectionAsync();
      } catch {
        // ignore
      }
      return;
    }

    if (remaining <= 0) return;

    const nextRemaining = remaining - 1;
    setRemainingMap((prev) => ({ ...prev, [current.id]: nextRemaining }));

    try {
      if (nextRemaining === 0) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // ignore
    }

    recordActivity('adhkar', 1).then(({ newBadges }) => {
      if (newBadges[0]) {
        const b = newBadges[0];
        Alert.alert(`وسام جديد ${b.icon}`, `${b.title}\n${b.description}`);
      }
    });

    if (nextRemaining > 0) return;

    if (index < items.length - 1) {
      animateToIndex(index + 1);
    } else {
      setFinished(true);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore
      }
    }
  }

  function goPrev() {
    if (index <= 0 || advancingRef.current) return;
    animateToIndex(index - 1);
  }

  function goNext() {
    if (index >= items.length - 1 || advancingRef.current) return;
    animateToIndex(index + 1);
  }

  function resetCurrent() {
    if (!current) return;
    setRemainingMap((prev) => ({ ...prev, [current.id]: current.count }));
    setRevealed(!hifzMode);
    setFinished(false);
  }

  async function restartCategory() {
    if (!category) return;
    await clearAdhkarProgress(categoryId);
    setRemainingMap(buildRemainingMap(category.items));
    setIndex(0);
    setFinished(false);
    setRevealed(!hifzMode);
    fade.setValue(1);
    slide.setValue(0);
  }

  function confirmDeleteCurrent() {
    if (categoryId !== 'custom' || !current) return;
    Alert.alert(t('adhkar.deleteDhikr'), t('adhkar.deleteConfirm'), [
      { text: t('adhkar.cancel'), style: 'cancel' },
      {
        text: t('adhkar.delete'),
        style: 'destructive',
        onPress: async () => {
          await removeCustomDhikr(current.id);
          await refreshCustomAdhkarSearchCache().catch(() => undefined);
          await reloadCategory();
        },
      },
    ]);
  }

  if (!category) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>{t('adhkar.notFound')}</Text>
      </View>
    );
  }

  if (!current) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', padding: 24 }]}>
        <Text style={{ color: colors.text, textAlign: 'center', fontFamily: fonts.uiBold, fontSize: 16 }}>
          {categoryId === 'custom' ? t('adhkar.emptyCustom') : t('adhkar.empty')}
        </Text>
      </View>
    );
  }

  const fontFamily = resolveFontFamily(prefs.fontFamily) ?? fonts.quran;
  const fontSize = Math.max(prefs.fontSize, 26);
  const lineHeight = Math.round(fontSize * 2.05);
  const progressPct = toEasternDigits(Math.round(progress * 100));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          isDark
            ? [colors.primaryDark, colors.surface]
            : [colors.primary, colors.primaryLight]
        }
        style={styles.topBar}
      >
        <View style={styles.topRow}>
          <View style={styles.topActions}>
            <TouchableOpacity
              style={[styles.aaBtn, hifzMode && styles.hifzBtnActive]}
              onPress={() => {
                setHifzMode((v) => !v);
              }}
            >
              <Text style={styles.aaText}>{hifzMode ? t('adhkar.hifzOn') : t('adhkar.hifzOff')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.aaBtn} onPress={() => setShowControls((v) => !v)}>
              <Text style={styles.aaText}>Aa</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.topTitles}>
            <Text style={[styles.catTitle, { fontFamily: fonts.uiExtra }]} numberOfLines={1}>
              {category.titleAr}
            </Text>
            <Text style={[styles.catMeta, { fontFamily: fonts.uiRegular }]}>
              {toEasternDigits(index + 1)} / {toEasternDigits(items.length)}
              {hifzMode ? t('adhkar.hifzBadge') : ''}
            </Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={[styles.progressText, { fontFamily: fonts.ui }]}>
          {t('adhkar.progressDone', { n: progressPct })}
        </Text>
      </LinearGradient>

      {showControls ? (
        <ReadingControls
          prefs={prefs}
          onChange={async (patch) => setPrefs(await setReadingPrefs(patch))}
          showTheme
        />
      ) : null}

      {finished ? (
        <View style={styles.doneWrap}>
          <Text style={[styles.doneTitle, { color: colors.primary, fontFamily: fonts.uiExtra }]}>
            {t('adhkar.accepted')}
          </Text>
          <Text style={[styles.doneSub, { color: colors.textSecondary, fontFamily: fonts.uiRegular }]}>
            {t('adhkar.finished', { title: category.titleAr })}
          </Text>
          <TouchableOpacity
            style={[styles.restartBtn, { backgroundColor: colors.primary }]}
            onPress={restartCategory}
          >
            <Text style={[styles.restartText, { fontFamily: fonts.uiBold }]}>{t('adhkar.restart')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tapArea}>
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={goPrev}
              disabled={index <= 0}
            >
              <Icon name="chevron-right" size={18} color={index <= 0 ? colors.border : colors.text} />
              <Text style={{ color: colors.text, fontFamily: fonts.ui, fontSize: 13 }}>{t('adhkar.prev')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={resetCurrent}>
              <Text style={{ color: colors.textSecondary, fontFamily: fonts.ui, fontSize: 13 }}>
                {t('adhkar.resetOne')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={goNext}
              disabled={index >= items.length - 1}
            >
              <Text style={{ color: colors.text, fontFamily: fonts.ui, fontSize: 13 }}>{t('adhkar.next')}</Text>
              <Icon
                name="chevron-left"
                size={18}
                color={index >= items.length - 1 ? colors.border : colors.text}
              />
            </TouchableOpacity>
          </View>

          {categoryId === 'custom' ? (
            <TouchableOpacity onPress={confirmDeleteCurrent} style={styles.deleteBtn}>
              <Text style={{ color: colors.error, fontFamily: fonts.ui, fontSize: 13 }}>
                {t('adhkar.deleteDhikr')}
              </Text>
            </TouchableOpacity>
          ) : null}

          {hifzMode ? (
            <Text style={[styles.hifzHint, { color: colors.accent, fontFamily: fonts.ui }]}>
              {t('adhkar.hifzHint')}
            </Text>
          ) : null}

          <Animated.View
            style={[styles.dhikrStage, { opacity: fade, transform: [{ translateX: slide }] }]}
          >
            <ScrollView
              contentContainerStyle={styles.dhikrScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable onPress={onTapCount} style={styles.dhikrPress}>
                <Text
                  style={[
                    styles.dhikrText,
                    {
                      color: colors.text,
                      fontSize,
                      lineHeight,
                      fontFamily,
                      opacity: hifzMode && !revealed ? 0.08 : 1,
                    },
                  ]}
                >
                  {hifzMode && !revealed ? '████ ███ ████ ██ ████' : current.text}
                </Text>

                {revealed || !hifzMode ? (
                  <>
                    {current.translation ? (
                      <Text
                        style={[
                          styles.metaText,
                          { color: colors.textSecondary, fontFamily: fonts.uiRegular },
                        ]}
                      >
                        {current.translation}
                      </Text>
                    ) : null}
                    {current.fadl ? (
                      <Text style={[styles.fadl, { color: colors.primary, fontFamily: fonts.ui }]}>
                        {t('adhkar.fadlPrefix', { text: current.fadl })}
                      </Text>
                    ) : null}
                    {current.source ? (
                      <Text
                        style={[
                          styles.source,
                          { color: colors.textSecondary, fontFamily: fonts.uiRegular },
                        ]}
                      >
                        {current.source}
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </Pressable>
            </ScrollView>
          </Animated.View>

          <Pressable style={styles.counterDock} onPress={onTapCount}>
            <View
              style={[
                styles.counterCircle,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.primary,
                  shadowColor: colors.primary,
                },
              ]}
            >
              <Text style={[styles.counterLabel, { color: colors.textSecondary, fontFamily: fonts.ui }]}>
                {t('adhkar.remaining')}
              </Text>
              <Text style={[styles.counterValue, { color: colors.primary, fontFamily: fonts.uiExtra }]}>
                {toEasternDigits(remaining)}
              </Text>
            </View>
            <Text style={[styles.tapHint, { color: colors.textSecondary, fontFamily: fonts.uiRegular }]}>
              {t('adhkar.tapHint', { n: toEasternDigits(current.count) })}
            </Text>
          </Pressable>

          <ShareButton
            style={styles.shareBtn}
            onShare={() =>
              shareDhikr({
                text: current.text,
                categoryTitle: category.titleAr,
                translation: current.translation,
                source: current.source,
              })
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aaBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  hifzBtnActive: {
    backgroundColor: 'rgba(199,146,45,0.95)',
  },
  aaText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  topTitles: { flex: 1 },
  catTitle: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'right',
  },
  catMeta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    textAlign: 'right',
    marginTop: 2,
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C4A96A',
    borderRadius: 4,
  },
  progressText: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    textAlign: 'left',
    fontSize: 12,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  hifzHint: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 4,
  },
  tapArea: {
    flex: 1,
    paddingBottom: 130,
  },
  shareBtn: {
    marginBottom: 6,
  },
  dhikrStage: { flex: 1 },
  dhikrScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  dhikrPress: {
    minHeight: 220,
    justifyContent: 'center',
  },
  dhikrText: {
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  metaText: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 14,
    lineHeight: 22,
  },
  fadl: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
    lineHeight: 22,
  },
  source: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
  },
  counterDock: {
    alignItems: 'center',
    paddingBottom: 8,
    gap: 8,
  },
  counterCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  counterLabel: { fontSize: 12 },
  counterValue: { fontSize: 36, lineHeight: 42, marginTop: 2 },
  tapHint: { fontSize: 13 },
  doneWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 100,
  },
  doneTitle: { fontSize: 28, textAlign: 'center' },
  doneSub: { fontSize: 16, marginTop: 10, textAlign: 'center' },
  restartBtn: {
    marginTop: 28,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  restartText: { color: '#fff', fontSize: 16 },
  error: { textAlign: 'center', marginTop: 40 },
});
