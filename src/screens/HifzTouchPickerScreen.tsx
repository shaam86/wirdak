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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '../components/Icon';
import { surahs } from '../data/surahs';
import { useI18n } from '../i18n/LanguageContext';
import { HomeStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { control, radius, softShadow, space } from '../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'HifzTouchPicker'>;
};

export function HifzTouchPickerScreen({ navigation }: Props) {
  const { colors, isDark, fonts, scale } = useTheme();
  const { t, textAlign } = useI18n();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        s.nameAr.includes(q) ||
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        String(s.number) === q
    );
  }, [query]);

  function openTouch(surahNumber: number, surahName: string) {
    navigation.navigate('HifzTouchSession', {
      surahNumber,
      surahName,
      startAyah: 1,
    });
  }

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
        <Text style={[styles.title, { fontFamily: fonts.uiBold, fontSize: scale(26) }]}>
          {t('hifz.hubTitle')}
        </Text>
        <Text style={[styles.sub, { fontSize: scale(14) }]}>{t('hifz.hubHint')}</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('hifz.searchSurah')}
          placeholderTextColor="rgba(255,255,255,0.65)"
          style={[styles.search, { textAlign, fontFamily: fonts.ui, fontSize: scale(16) }]}
        />
      </LinearGradient>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, fontFamily: fonts.uiBold, textAlign, fontSize: scale(15) },
          ]}
        >
          {t('hifz.touchSection')}
        </Text>
        <Text
          style={[
            styles.sectionHint,
            { color: colors.textSecondary, textAlign, fontSize: scale(12) },
          ]}
        >
          {t('hifz.touchSectionHint')}
        </Text>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: colors.primary }]}
          onPress={() => openTouch(1, 'الفاتحة')}
        >
          <Icon name="hand-left" size={20} color="#fff" />
          <Text style={[styles.quickBtnText, { fontSize: scale(15) }]}>{t('hifz.openTouchHifz')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.number)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text
            style={[
              styles.listHeader,
              {
                color: colors.textSecondary,
                textAlign,
                fontFamily: fonts.uiBold,
                fontSize: scale(13),
              },
            ]}
          >
            {t('hifz.pickSurahTouch')}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.row,
              { backgroundColor: colors.surface, borderColor: colors.border },
              softShadow(isDark),
            ]}
            onPress={() => openTouch(item.number, item.nameAr)}
            activeOpacity={0.85}
          >
            <View style={[styles.num, { backgroundColor: colors.iconWell }]}>
              <Text style={{ color: colors.primary, fontFamily: fonts.uiBold }}>{item.number}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: fonts.uiBold,
                  textAlign,
                  fontSize: scale(17),
                }}
              >
                {item.nameAr}
              </Text>
              <Text style={{ color: colors.textSecondary, textAlign, fontSize: scale(13) }}>
                {item.ayahCount} {t('hifz.ayahs')}
              </Text>
            </View>
            <Text style={{ color: colors.accent, fontFamily: fonts.uiBold }}>{t('hifz.start')}</Text>
            <Icon name="chevron-left" size={control.iconMd} color={colors.textSecondary} filled={false} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingTop: 20,
    paddingHorizontal: control.screenInset,
    paddingBottom: 20,
  },
  title: { color: '#fff', textAlign: 'center', marginBottom: 6 },
  sub: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 22,
  },
  search: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    minHeight: 44,
  },
  section: {
    marginHorizontal: control.screenInset,
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 8,
  },
  sectionTitle: {},
  sectionHint: { lineHeight: 18 },
  quickBtn: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: radius.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickBtnText: { color: '#fff', fontWeight: '800' },
  list: { padding: control.screenInset, paddingBottom: 40 },
  listHeader: { marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: 10,
    minHeight: control.rowMin,
  },
  num: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
