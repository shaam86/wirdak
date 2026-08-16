import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { ErrorView } from '../components/ErrorView';
import { HomeStackParamList } from '../navigation/types';
import { recordActivity } from '../services/activityStore';
import {
  completeMushafPage,
  getKhatmahById,
  getPositionLabel,
  updateKhatmahPosition,
} from '../services/khatmahStore';
import { fetchMushafPage, MUSHAF_PAGE_COUNT, MushafPageData, PageAyah } from '../services/quranApi';
import { mushaf } from '../theme/mushaf';
import { toEasternDigits } from '../utils/arabicNumerals';
import { BASMALA_UTHMANI, stripLeadingBasmala, surahShowsBasmala } from '../utils/mushafText';

type Props = {
  route: RouteProp<HomeStackParamList, 'KhatmahPage'>;
};

export function KhatmahPageScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { khatmahId } = route.params;
  const [fontsLoaded] = useFonts({
    AmiriQuran: require('../../assets/fonts/AmiriQuran-Regular.ttf'),
  });

  const [khatmahName, setKhatmahName] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState<MushafPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PageAyah | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const record = await getKhatmahById(khatmahId);
      if (!record) throw new Error('الختمة غير موجودة');
      setKhatmahName(record.khatmah_name);
      const p = Math.max(1, record.current_page || 1);
      setPageNumber(p);
      const data = await fetchMushafPage(p);
      setPage(data);
      // مزامنة الموضع مع أول آية في الصفحة إن لزم
      const first = data.ayahs[0];
      if (first) {
        await updateKhatmahPosition(
          khatmahId,
          first.surahNumber,
          first.numberInSurah,
          data.page
        );
      }
    } catch {
      setError('تعذّر تحميل صفحة المصحف. تحقق من الاتصال.');
    } finally {
      setLoading(false);
    }
  }, [khatmahId]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    if (!page) return [];
    const map = new Map<number, { surahNumber: number; surahNameAr: string; ayahs: PageAyah[] }>();
    for (const ayah of page.ayahs) {
      const g = map.get(ayah.surahNumber);
      if (g) g.ayahs.push(ayah);
      else {
        map.set(ayah.surahNumber, {
          surahNumber: ayah.surahNumber,
          surahNameAr: ayah.surahNameAr,
          ayahs: [ayah],
        });
      }
    }
    return Array.from(map.values());
  }, [page]);

  async function onCompletePage() {
    if (advancing) return;
    setAdvancing(true);
    try {
      const result = await completeMushafPage(khatmahId);
      await recordActivity('wird');
      await recordActivity('quran');
      if (result.completedKhatmah) {
        Alert.alert('مبارك الختمة', 'أتممت المصحف. تقبّل الله منك.', [
          {
            text: 'حسناً',
            onPress: () => navigation.navigate('KhatmahDetail', { khatmahId }),
          },
        ]);
        return;
      }
      setPageNumber(result.nextPage);
      setSelected(null);
      const data = await fetchMushafPage(result.nextPage);
      setPage(data);
    } catch {
      Alert.alert('تنبيه', 'تعذّر الانتقال للصفحة التالية.');
    } finally {
      setAdvancing(false);
    }
  }

  async function onSaveSelectedAyah() {
    if (!selected) return;
    await updateKhatmahPosition(
      khatmahId,
      selected.surahNumber,
      selected.numberInSurah,
      selected.page ?? pageNumber
    );
    Alert.alert('تم الحفظ', `وُضع مؤشر الختمة عند آية ${selected.numberInSurah}.`);
  }

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={mushaf.gold} size="large" />
        <Text style={styles.loadingText}>جاري فتح صفحة الختمة...</Text>
      </View>
    );
  }

  if (error || !page) {
    return <ErrorView message={error ?? 'تعذّر التحميل'} />;
  }

  const isLast = pageNumber >= MUSHAF_PAGE_COUNT;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.topMeta}>الجزء {toEasternDigits(page.juz)}</Text>
        <Text style={styles.topTitle} numberOfLines={1}>
          {khatmahName}
        </Text>
        <Text style={styles.topMeta}>ص {toEasternDigits(pageNumber)}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.pageOuter}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageFrame}>
          <View style={styles.pageInner}>
            {groups.map((group) => {
              const showBanner = group.ayahs.some((a) => a.numberInSurah === 1);
              const showBasmala =
                showBanner && surahShowsBasmala(group.surahNumber);
              return (
                <View key={group.surahNumber} style={styles.surahBlock}>
                  {showBanner ? (
                    <View style={styles.banner}>
                      <Text style={styles.bannerText}>سُورَةُ {group.surahNameAr}</Text>
                    </View>
                  ) : null}
                  {showBasmala ? <Text style={styles.basmala}>{BASMALA_UTHMANI}</Text> : null}
                  <Text style={styles.body}>
                    {group.ayahs.map((ayah) => {
                      const text =
                        showBasmala && ayah.numberInSurah === 1
                          ? stripLeadingBasmala(ayah.text) || ayah.text
                          : ayah.text;
                      const isSelected =
                        selected?.surahNumber === ayah.surahNumber &&
                        selected?.numberInSurah === ayah.numberInSurah;
                      return (
                        <Text
                          key={`${ayah.surahNumber}-${ayah.numberInSurah}`}
                          onPress={() => setSelected(ayah)}
                          style={[styles.ayah, isSelected && styles.ayahSelected]}
                        >
                          {text}
                          <Text style={styles.marker}>
                            {' '}
                            ﴿{toEasternDigits(ayah.numberInSurah)}﴾{' '}
                          </Text>
                        </Text>
                      );
                    })}
                  </Text>
                </View>
              );
            })}

            <View style={styles.pageOvalWrap}>
              <View style={styles.pageOval}>
                <Text style={styles.pageOvalText}>{toEasternDigits(pageNumber)}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {selected ? (
          <TouchableOpacity style={styles.secondaryAction} onPress={onSaveSelectedAyah}>
            <Text style={styles.secondaryActionText}>
              احفظ موقفي عند الآية {toEasternDigits(selected.numberInSurah)}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.hint}>اضغط آية لحفظ موضع مخصص • أو أكمل الصفحة للانتقال تلقائياً</Text>
        )}

        <TouchableOpacity
          style={[styles.primaryAction, advancing && { opacity: 0.7 }]}
          onPress={onCompletePage}
          disabled={advancing}
        >
          {advancing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryActionText}>
              {isLast ? 'إتمام الختمة ✓' : `أكملت الصفحة ← الصفحة ${toEasternDigits(pageNumber + 1)}`}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.progressHint}>
          {getPositionLabel({
            khatmah_id: khatmahId,
            khatmah_name: khatmahName,
            creation_date: '',
            current_surah_id: page.ayahs[0]?.surahNumber ?? 1,
            current_ayah_id: page.ayahs[0]?.numberInSurah ?? 1,
            current_page: pageNumber,
            is_completed: false,
            wird_amount: 'page',
            completed_at: null,
          })}{' '}
          • {Math.round(((pageNumber - 1) / MUSHAF_PAGE_COUNT) * 100)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: mushaf.paperDeep },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mushaf.paper,
    gap: 12,
  },
  loadingText: { color: mushaf.muted, fontSize: 13 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: mushaf.paper,
    borderBottomWidth: 1,
    borderBottomColor: mushaf.goldSoft,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    color: mushaf.goldDark,
    fontWeight: '800',
    fontSize: 14,
    marginHorizontal: 8,
  },
  topMeta: { color: mushaf.gold, fontWeight: '700', fontSize: 13, minWidth: 48, textAlign: 'center' },
  scroll: { flex: 1 },
  pageOuter: { padding: 12, paddingBottom: 20 },
  pageFrame: {
    backgroundColor: mushaf.paper,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: mushaf.frame,
    padding: 3,
  },
  pageInner: {
    borderWidth: 1,
    borderColor: mushaf.goldSoft,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 16,
  },
  surahBlock: { marginBottom: 10 },
  banner: {
    backgroundColor: mushaf.goldSoft,
    borderWidth: 1,
    borderColor: mushaf.gold,
    paddingVertical: 8,
    marginBottom: 10,
  },
  bannerText: {
    textAlign: 'center',
    color: mushaf.goldDark,
    fontFamily: 'AmiriQuran',
    fontSize: 22,
  },
  basmala: {
    textAlign: 'center',
    fontFamily: 'AmiriQuran',
    fontSize: 24,
    lineHeight: 44,
    color: mushaf.ink,
    marginBottom: 10,
  },
  body: {
    textAlign: 'justify',
    writingDirection: 'rtl',
    fontFamily: 'AmiriQuran',
    fontSize: 25,
    lineHeight: 52,
    color: mushaf.ink,
  },
  ayah: {
    fontFamily: 'AmiriQuran',
    fontSize: 25,
    lineHeight: 52,
    color: mushaf.ink,
  },
  ayahSelected: { backgroundColor: mushaf.highlight },
  marker: { color: mushaf.gold, fontSize: 16, fontFamily: 'AmiriQuran' },
  pageOvalWrap: { alignItems: 'center', marginTop: 18 },
  pageOval: {
    minWidth: 56,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: mushaf.gold,
  },
  pageOvalText: { color: mushaf.goldDark, fontWeight: '800', textAlign: 'center' },
  bottomBar: {
    backgroundColor: mushaf.paper,
    borderTopWidth: 1,
    borderTopColor: mushaf.goldSoft,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
  },
  hint: {
    textAlign: 'center',
    color: mushaf.muted,
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 16,
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: mushaf.goldLight,
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#FBF6EC',
  },
  secondaryActionText: {
    textAlign: 'center',
    color: mushaf.goldDark,
    fontWeight: '700',
    fontSize: 13,
  },
  primaryAction: {
    backgroundColor: '#0E5F63',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryActionText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  progressHint: {
    textAlign: 'center',
    color: mushaf.muted,
    fontSize: 11,
    marginTop: 8,
  },
});
