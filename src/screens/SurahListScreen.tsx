import { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../components/Icon';
import { juzList } from '../data/juz';
import { surahs } from '../data/surahs';
import { useI18n } from '../i18n/LanguageContext';
import { QuranListNavigation } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { control, radius, softShadow, space } from '../theme/tokens';

type Props = {
  navigation: QuranListNavigation;
};

type Tab = 'surahs' | 'juz';

export function SurahListScreen({ navigation }: Props) {
  const { colors, isDark, fonts } = useTheme();
  const { t, textAlign } = useI18n();
  const [tab, setTab] = useState<Tab>('surahs');
  const [query, setQuery] = useState('');

  const filteredSurahs = useMemo(() => {
    const q = query.trim();
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        s.nameAr.includes(q) ||
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        String(s.number) === q
    );
  }, [query]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          isDark
            ? [colors.primaryDark, colors.background]
            : [colors.primary, colors.primaryLight, colors.background]
        }
        style={styles.hero}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { fontFamily: fonts.uiExtra }]}>{t('index.title')}</Text>
        </View>
        <View style={styles.heroActions}>
          <TouchableOpacity
            style={styles.heroChip}
            onPress={() => navigation.navigate('MushafBrowse', { page: 1 })}
          >
            <Icon name="book" size={16} color="#fff" />
            <Text style={styles.heroChipText}>{t('index.mushafBrowse')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.heroChip}
            onPress={() => navigation.navigate('SmartSearch')}
          >
            <Icon name="search" size={16} color="#fff" />
            <Text style={styles.heroChipText}>{t('index.smartSearch')}</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('index.searchSurah')}
          placeholderTextColor="rgba(255,255,255,0.65)"
          style={[styles.search, { textAlign, fontFamily: fonts.ui }]}
        />
      </LinearGradient>

      <View style={[styles.tabs, { backgroundColor: colors.sand }]}>
        <TouchableOpacity
          style={[styles.tab, tab === 'juz' && { backgroundColor: colors.primary }]}
          onPress={() => setTab('juz')}
        >
          <Text
            style={{
              color: tab === 'juz' ? '#fff' : colors.text,
              fontFamily: fonts.uiBold,
            }}
          >
            {t('index.juz')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'surahs' && { backgroundColor: colors.primary }]}
          onPress={() => setTab('surahs')}
        >
          <Text
            style={{
              color: tab === 'surahs' ? '#fff' : colors.text,
              fontFamily: fonts.uiBold,
            }}
          >
            {t('index.surahs')}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'surahs' ? (
        <FlatList
          data={filteredSurahs}
          keyExtractor={(item) => String(item.number)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.border },
                softShadow(isDark),
              ]}
              onPress={() =>
                navigation.navigate('SurahDetail', {
                  surahNumber: item.number,
                  surahName: item.nameAr,
                })
              }
              activeOpacity={0.85}
            >
              <View style={[styles.num, { backgroundColor: colors.iconWell }]}>
                <Text style={{ color: colors.primary, fontFamily: fonts.uiBold }}>
                  {item.number}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.nameAr, { color: colors.text, fontFamily: fonts.uiBold, textAlign }]}>
                  سورة {item.nameAr}
                </Text>
                <Text
                  style={[
                    styles.nameEn,
                    { color: colors.textSecondary, fontFamily: fonts.uiRegular, textAlign },
                  ]}
                >
                  {item.name}
                </Text>
              </View>
              <Text style={[styles.meta, { color: colors.primary, fontFamily: fonts.ui }]}>
                {item.ayahCount} آية
              </Text>
              <Icon name="chevron-left" size={control.iconMd} color={colors.textSecondary} filled={false} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={juzList}
          keyExtractor={(item) => String(item.number)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.border },
                softShadow(isDark),
              ]}
              onPress={() =>
                navigation.navigate('SurahDetail', {
                  surahNumber: item.startSurah,
                  surahName: item.startSurahAr,
                  startAyah: item.startAyah,
                })
              }
              activeOpacity={0.85}
            >
              <View style={[styles.num, { backgroundColor: colors.iconWell }]}>
                <Text style={{ color: colors.primary, fontFamily: fonts.uiBold }}>
                  {item.number}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.nameAr, { color: colors.text, fontFamily: fonts.uiBold, textAlign }]}>
                  الجزء {item.number}
                </Text>
                <Text
                  style={[
                    styles.nameEn,
                    { color: colors.textSecondary, fontFamily: fonts.uiRegular, textAlign },
                  ]}
                >
                  سورة {item.startSurahAr}
                </Text>
              </View>
              <Icon name="chevron-left" size={control.iconMd} color={colors.textSecondary} filled={false} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingTop: 54,
    paddingBottom: 18,
    paddingHorizontal: control.screenInset,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    minHeight: 36,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    textAlign: 'center',
    lineHeight: 40,
  },
  heroActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 40,
  },
  heroChipText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  search: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 44,
  },
  tabs: {
    marginHorizontal: control.screenInset,
    marginTop: 12,
    borderRadius: radius.md,
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  list: { padding: control.screenInset, paddingBottom: 130, gap: 10 },
  row: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: control.rowMin,
  },
  num: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  nameAr: { fontSize: 17 },
  nameEn: { fontSize: 12, marginTop: 2 },
  meta: { fontSize: 12 },
});
