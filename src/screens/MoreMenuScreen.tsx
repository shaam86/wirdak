import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Icon, IconBadge, IconName } from '../components/Icon';
import { APP_LANGUAGES } from '../i18n';
import { useI18n } from '../i18n/LanguageContext';
import { MoreMenuNavigation, MoreStackParamList } from '../navigation/types';
import { getActiveKhatmahSummary, listKhatmahs } from '../services/khatmahStore';
import { shareWeeklyReport } from '../services/weeklyReport';
import type { FeatureTintKey } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { control, radius, softShadow, space } from '../theme/tokens';

type Props = {
  navigation: MoreMenuNavigation;
};

type Row = {
  title: string;
  subtitle?: string;
  icon: IconName;
  tint: FeatureTintKey;
  onPress: () => void;
};

export function MoreMenuScreen({ navigation }: Props) {
  const { colors, isDark, mode, setMode, fonts } = useTheme();
  const { t, textAlign, language, setLanguage } = useI18n();
  const [stats, setStats] = useState({ completed: 0, active: 0, primaryName: '' });
  const chevron = textAlign === 'right' ? 'chevron-left' : 'chevron-right';

  useFocusEffect(
    useCallback(() => {
      listKhatmahs().then((rows) => {
        const summary = getActiveKhatmahSummary(rows);
        setStats({
          completed: summary.completedCount,
          active: summary.activeCount,
          primaryName: summary.primary?.khatmah_name ?? '',
        });
      });
    }, [])
  );

  function openSurah(surahNumber: number, surahName: string) {
    navigation.getParent()?.navigate('Index', {
      screen: 'SurahDetail',
      params: { surahNumber, surahName, startAyah: 1, autoPlay: false },
    });
  }

  function openMoreScreen(screen: keyof Omit<MoreStackParamList, 'MoreMenu'>) {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: 'MoreMenu' }, { name: screen }],
      })
    );
  }

  const sunan = [
    {
      title: t('more.kahf'),
      subtitle: t('more.kahfSub'),
      icon: 'kahf' as IconName,
      tint: 'quran' as FeatureTintKey,
      surahNumber: 18,
      surahName: 'الكهف',
    },
    {
      title: t('more.mulk'),
      subtitle: t('more.mulkSub'),
      icon: 'mulk' as IconName,
      tint: 'reminders' as FeatureTintKey,
      surahNumber: 67,
      surahName: 'الملك',
    },
    {
      title: t('more.baqarah'),
      subtitle: t('more.baqarahSub'),
      icon: 'baqarah' as IconName,
      tint: 'khatmah' as FeatureTintKey,
      surahNumber: 2,
      surahName: 'البقرة',
    },
  ];

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: t('more.prayerQibla'),
      rows: [
        {
          title: t('more.qibla'),
          subtitle: t('more.qiblaSub'),
          icon: 'compass',
          tint: 'qibla',
          onPress: () => openMoreScreen('Qibla'),
        },
        {
          title: t('more.settings'),
          subtitle: t('more.settingsSub'),
          icon: 'settings',
          tint: 'search',
          onPress: () => openMoreScreen('AppSettings'),
        },
      ],
    },
    {
      title: t('more.remindersSection'),
      rows: [
        {
          title: t('more.reminders'),
          subtitle: t('more.remindersSub'),
          icon: 'bell',
          tint: 'reminders',
          onPress: () => openMoreScreen('Reminders'),
        },
      ],
    },
    {
      title: t('more.sunan'),
      rows: sunan.map((s) => ({
        title: s.title,
        subtitle: s.subtitle,
        icon: s.icon,
        tint: s.tint,
        onPress: () => openSurah(s.surahNumber, s.surahName),
      })),
    },
    {
      title: t('more.mushaf'),
      rows: [
        {
          title: t('more.hifz'),
          subtitle: t('more.hifzSub'),
          icon: 'hand-left',
          tint: 'quran',
          onPress: () =>
            navigation.getParent()?.navigate('Home', { screen: 'HifzTouchPicker' }),
        },
        {
          title: t('more.bookmarks'),
          subtitle: t('more.bookmarksSub'),
          icon: 'bookmark',
          tint: 'khatmah',
          onPress: () => openMoreScreen('Bookmarks'),
        },
      ],
    },
    {
      title: t('more.activity'),
      rows: [
        {
          title: t('home.tasbih'),
          subtitle: t('home.tasbihSub'),
          icon: 'circle',
          tint: 'tasbih',
          onPress: () =>
            navigation.getParent()?.dispatch(
              CommonActions.navigate({
                name: 'Home',
                params: {
                  state: {
                    routes: [{ name: 'HomeMain' }, { name: 'Tasbih' }],
                    index: 1,
                  },
                },
              })
            ),
        },
        {
          title: t('more.dashboard'),
          subtitle: t('more.dashboardSub'),
          icon: 'award',
          tint: 'badges',
          onPress: () => openMoreScreen('Dashboard'),
        },
        {
          title: t('moreExtra.weeklyReport'),
          subtitle: t('moreExtra.weeklyReportSub'),
          icon: 'award',
          tint: 'reminders',
          onPress: async () => {
            const ok = await shareWeeklyReport();
            if (!ok) Alert.alert(t('moreExtra.shareFailed'), t('moreExtra.tryAgain'));
          },
        },
        {
          title: t('more.search'),
          subtitle: t('more.searchSub'),
          icon: 'search',
          tint: 'search',
          onPress: () => openMoreScreen('Search'),
        },
      ],
    },
    {
      title: t('home.khatmah'),
      rows: [
        {
          title: t('home.khatmahManage'),
          subtitle: stats.primaryName
            ? `${stats.primaryName} • ${t('more.statsActive', { n: stats.active })}`
            : t('more.statsActive', { n: stats.active }),
          icon: 'layers',
          tint: 'khatmah',
          onPress: () =>
            navigation.getParent()?.navigate('Home', { screen: 'KhatmahList' }),
        },
        {
          title: t('more.statsDone', { n: stats.completed || '—' }),
          subtitle: String(stats.completed || '—'),
          icon: 'star',
          tint: 'badges',
          onPress: () =>
            navigation.getParent()?.navigate('Home', { screen: 'KhatmahList' }),
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          isDark
            ? [colors.primaryDark, colors.glow, colors.background]
            : [colors.primaryDark, colors.primary, colors.primaryLight]
        }
        style={styles.hero}
      >
        <Text style={[styles.title, { textAlign, fontFamily: fonts.uiExtra }]}>
          {t('more.title')}
        </Text>
        <Text style={[styles.subtitle, { textAlign, fontFamily: fonts.uiRegular }]}>
          {t('settings.subtitle')}
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.themeCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            softShadow(isDark),
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, textAlign, fontFamily: fonts.uiBold },
            ]}
          >
            {t('settings.language')}
          </Text>
          <View
            style={[
              styles.themeRow,
              { justifyContent: textAlign === 'right' ? 'flex-end' : 'flex-start' },
            ]}
          >
            {APP_LANGUAGES.map((opt) => {
              const selected = language === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.sand,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setLanguage(opt.id)}
                >
                  <Text
                    style={{
                      color: selected ? '#fff' : colors.text,
                      fontFamily: fonts.uiBold,
                      fontSize: 13,
                    }}
                  >
                    {opt.nativeLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.themeCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            softShadow(isDark),
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, textAlign, fontFamily: fonts.uiBold },
            ]}
          >
            {t('more.theme')}
          </Text>
          <View
            style={[
              styles.themeRow,
              { justifyContent: textAlign === 'right' ? 'flex-end' : 'flex-start' },
            ]}
          >
            {(
              [
                ['light', t('settings.light')],
                ['dark', t('settings.dark')],
                ['system', t('settings.system')],
              ] as const
            ).map(([id, label]) => (
              <TouchableOpacity
                key={id}
                style={[
                  styles.themeChip,
                  {
                    backgroundColor: mode === id ? colors.primary : colors.sand,
                    borderColor: mode === id ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setMode(id)}
              >
                <Text
                  style={{
                    color: mode === id ? '#fff' : colors.text,
                    fontFamily: fonts.uiBold,
                    fontSize: 13,
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textSecondary, textAlign, fontFamily: fonts.uiBold },
              ]}
            >
              {section.title}
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
                softShadow(isDark),
              ]}
            >
              {section.rows.map((row, idx) => (
                <TouchableOpacity
                  key={`${section.title}-${row.title}`}
                  style={[
                    styles.row,
                    idx < section.rows.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={row.onPress}
                  activeOpacity={0.75}
                >
                  <IconBadge
                    name={row.icon}
                    tint={row.tint}
                    size={control.badgeMd}
                    iconSize={control.iconMd}
                  />
                  <View style={styles.rowInfo}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.text, textAlign, fontFamily: fonts.uiBold },
                      ]}
                    >
                      {row.title}
                    </Text>
                    {row.subtitle ? (
                      <Text
                        style={[
                          styles.rowSub,
                          { color: colors.textSecondary, textAlign, fontFamily: fonts.uiRegular },
                        ]}
                      >
                        {row.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <Icon name={chevron} size={control.iconMd} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingTop: 54,
    paddingBottom: 22,
    paddingHorizontal: control.screenInset,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 40,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    lineHeight: 22,
    fontSize: 14,
  },
  content: { padding: control.screenInset, paddingBottom: 130 },
  themeCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
    marginBottom: space.md,
  },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  themeChip: {
    paddingHorizontal: control.chipPadH,
    paddingVertical: control.chipPadV,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  section: { marginBottom: space.md },
  sectionTitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    minHeight: control.rowMin,
    gap: 12,
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 16 },
  rowSub: { fontSize: 12, marginTop: 3, lineHeight: 18 },
});
