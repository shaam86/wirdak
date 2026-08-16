import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ErrorView } from '../components/ErrorView';
import { useI18n } from '../i18n/LanguageContext';
import { QuranStackParamList } from '../navigation/types';
import {
  fetchMushafPage,
  MUSHAF_PAGE_COUNT,
  type MushafPageData,
} from '../services/quranApi';
import { useTheme } from '../theme/ThemeContext';
import { control, radius, space } from '../theme/tokens';
import { toEasternDigits } from '../utils/arabicNumerals';

type Props = {
  navigation: NativeStackNavigationProp<QuranStackParamList, 'MushafBrowse'>;
  route: { params?: { page?: number } };
};

export function MushafBrowseScreen({ route }: Props) {
  const { colors, isDark, fonts, scale } = useTheme();
  const { t, textAlign } = useI18n();
  const initial = Math.min(
    MUSHAF_PAGE_COUNT,
    Math.max(1, route.params?.page ?? 1)
  );
  const [page, setPage] = useState(initial);
  const [jump, setJump] = useState(String(initial));
  const [data, setData] = useState<MushafPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    const target = Math.min(MUSHAF_PAGE_COUNT, Math.max(1, p));
    setLoading(true);
    setError(null);
    try {
      const next = await fetchMushafPage(target);
      setData(next);
      setPage(target);
      setJump(String(target));
    } catch {
      setError(t('mushaf.pageOffline'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load(initial);
  }, [initial, load]);

  function go(delta: number) {
    void load(page + delta);
  }

  function applyJump() {
    const n = parseInt(jump.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(n)) return;
    void load(n);
  }

  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.background : '#EDE6D6' }]}>
      <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: colors.primary, opacity: page <= 1 ? 0.4 : 1 }]}
          disabled={page <= 1 || loading}
          onPress={() => go(-1)}
        >
          <Text style={styles.navBtnText}>{t('mushaf.prev')}</Text>
        </TouchableOpacity>

        <View style={styles.jumpWrap}>
          <TextInput
            value={jump}
            onChangeText={setJump}
            keyboardType="number-pad"
            style={[
              styles.jumpInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.sand,
                fontFamily: fonts.uiBold,
                textAlign: 'center',
              },
            ]}
            onSubmitEditing={applyJump}
          />
          <TouchableOpacity onPress={applyJump} style={[styles.goBtn, { backgroundColor: colors.accent }]}>
            <Text style={styles.navBtnText}>{t('mushaf.go')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.navBtn,
            { backgroundColor: colors.primary, opacity: page >= MUSHAF_PAGE_COUNT ? 0.4 : 1 },
          ]}
          disabled={page >= MUSHAF_PAGE_COUNT || loading}
          onPress={() => go(1)}
        >
          <Text style={styles.navBtnText}>{t('mushaf.next')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.meta, { color: colors.textSecondary, fontFamily: fonts.ui, textAlign }]}>
        {t('mushaf.pageOf', {
          n: toEasternDigits(page),
          total: toEasternDigits(MUSHAF_PAGE_COUNT),
        })}
        {data ? ` · ${t('mushaf.juz', { n: toEasternDigits(data.juz) })}` : ''}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <ErrorView message={error} />
      ) : data ? (
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? colors.surface : '#FBF7F0',
                borderColor: isDark ? colors.border : '#C9A227',
              },
            ]}
          >
            {data.ayahs.map((ayah) => (
              <Text
                key={`${ayah.surahNumber}-${ayah.numberInSurah}`}
                style={[
                  styles.ayah,
                  {
                    color: isDark ? colors.text : '#1A1510',
                    fontFamily: fonts.quran,
                    fontSize: scale(22),
                    lineHeight: scale(44),
                  },
                ]}
              >
                {ayah.text}{' '}
                <Text style={{ color: colors.accent, fontSize: scale(14) }}>
                  ﴿{toEasternDigits(ayah.numberInSurah)}﴾
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: scale(11) }}>
                  {' '}
                  ({ayah.surahNameAr})
                </Text>
              </Text>
            ))}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: control.screenInset,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    minHeight: 42,
    justifyContent: 'center',
  },
  navBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  jumpWrap: { flex: 1, flexDirection: 'row-reverse', gap: 6, alignItems: 'center' },
  jumpInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 42,
  },
  goBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    minHeight: 42,
    justifyContent: 'center',
  },
  meta: {
    paddingHorizontal: control.screenInset,
    paddingVertical: 8,
    fontSize: 13,
  },
  page: { padding: space.md, paddingBottom: 48 },
  sheet: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: space.lg,
    gap: 10,
  },
  ayah: {
    textAlign: 'justify',
    writingDirection: 'rtl',
  },
});
